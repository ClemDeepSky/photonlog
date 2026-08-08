import { useEffect, useRef, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

declare global {
  interface Window {
    A: any;
  }
}

interface SkyViewerProps {
  ra: string;
  dec: string;
  positionAngle?: number;
  panes?: { ra: string; dec: string; position_angle: number | null }[];
  isMosaic?: boolean;
  setupFocalLength?: number | null;
  setupSensorWidthMm?: number | null;
  setupSensorHeightMm?: number | null;
  setupName?: string | null;
  setups?: { name: string; focal_length: number | null; sensorWidthMm: number | null; sensorHeightMm: number | null }[];
  onSetupChange?: (name: string) => void;
}

const SENSORS: Record<string, { width: number; height: number; label: string }> = {
  "apsc": { width: 23.5, height: 15.6, label: "APS-C (23.5×15.6mm)" },
  "ff": { width: 36, height: 24, label: "Full Frame (36×24mm)" },
  "m43": { width: 17.3, height: 13, label: "Micro 4/3 (17.3×13mm)" },
  "apsh": { width: 28.7, height: 19, label: "APS-H (28.7×19mm)" },
};

// Generic sexagesimal parser: handles "20h 4m 23.5s", "20 04 23.5", "00h 42' 44\"", "34d 49m 33.3s"
const parseSexagesimal = (str: string): { value: number; parts: number } | null => {
  if (!str) return null;
  const nums = str.match(/[+-]?\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const [a, b, c] = nums.map((n) => parseFloat(n.replace(",", ".")));
  const sign = /^\s*-/.test(str) || a < 0 ? -1 : 1;
  const value = Math.abs(a) + (b || 0) / 60 + (c || 0) / 3600;
  return { value: sign * value, parts: nums.length };
};

// Parse RA string to degrees
const parseRA = (raStr: string): number | null => {
  const p = parseSexagesimal(raStr);
  if (!p) return null;
  // Hours if sexagesimal or explicit "h", otherwise already degrees
  const isHours = p.parts > 1 || /h/i.test(raStr);
  return isHours ? p.value * 15 : p.value;
};

// Parse DEC string to degrees
const parseDEC = (decStr: string): number | null => {
  const p = parseSexagesimal(decStr);
  return p ? p.value : null;
};

const calcFOVDeg = (sensorMm: number, focalMm: number): number => {
  return 2 * Math.atan(sensorMm / (2 * focalMm)) * (180 / Math.PI);
};

let aladinScriptLoaded = false;
let aladinInitPromise: Promise<void> | null = null;

const loadAladin = (): Promise<void> => {
  if (aladinInitPromise) return aladinInitPromise;

  aladinInitPromise = new Promise<void>((resolve, reject) => {
    // Add CSS
    if (!document.querySelector('link[href*="aladin"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.css";
      document.head.appendChild(link);
    }

    if (window.A) {
      // Already loaded, wait for init
      window.A.init.then(() => resolve()).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";
    script.charset = "utf-8";
    script.onload = () => {
      // A.init is a Promise that resolves when WASM is ready
      window.A.init.then(() => {
        aladinScriptLoaded = true;
        resolve();
      }).catch(reject);
    };
    script.onerror = () => { aladinInitPromise = null; reject(new Error("Failed to load Aladin Lite")); };
    document.head.appendChild(script);
  });

  return aladinInitPromise;
};

const SkyViewer = ({ ra, dec, positionAngle = 0, panes, isMosaic, setupFocalLength, setupSensorWidthMm, setupSensorHeightMm, setupName, setups, onSetupChange }: SkyViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [focalLength, setFocalLength] = useState(450);
  const [sensor, setSensor] = useState("apsc");

  const hasSetupSensor = !!(setupSensorWidthMm && setupSensorHeightMm);
  const sensorOptions: Record<string, { width: number; height: number; label: string }> = hasSetupSensor
    ? {
        setup: {
          width: setupSensorWidthMm as number,
          height: setupSensorHeightMm as number,
          label: `${setupName || "Setup"} (${(setupSensorWidthMm as number).toFixed(1)}×${(setupSensorHeightMm as number).toFixed(1)}mm)`,
        },
        ...SENSORS,
      }
    : SENSORS;

  // Sync with the selected equipment setup
  useEffect(() => {
    if (setupFocalLength) setFocalLength(setupFocalLength);
  }, [setupFocalLength]);

  useEffect(() => {
    if (hasSetupSensor) setSensor("setup");
    else setSensor((s) => (s === "setup" ? "apsc" : s));
  }, [hasSetupSensor, setupSensorWidthMm, setupSensorHeightMm]);

  // Load Aladin Lite
  useEffect(() => {
    let cancelled = false;
    loadAladin().then(() => {
      if (!cancelled) setReady(true);
    }).catch((err) => console.error("Aladin load error:", err));
    return () => { cancelled = true; };
  }, []);

  // Initialize / update Aladin view
  const hasCoordinates = !!(ra && dec);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.A) return;

    const raDeg = parseRA(ra);
    const decDeg = parseDEC(dec);
    const targetRA = raDeg ?? 10.684;
    const targetDEC = decDeg ?? 41.269;

    const sensorInfo = sensorOptions[sensor] || SENSORS.apsc;
    const fovW = calcFOVDeg(sensorInfo.width, focalLength);
    const fovH = calcFOVDeg(sensorInfo.height, focalLength);
    const maxFov = Math.max(fovW, fovH) * 2.5;

    try {
      if (!aladinRef.current) {
        aladinRef.current = window.A.aladin(containerRef.current, {
          target: `${targetRA} ${targetDEC}`,
          fov: maxFov,
          survey: "P/DSS2/color",
          showCooGridControl: false,
          showSimbadPointerControl: false,
          showShareControl: false,
          showSettingsControl: false,
          showFullscreenControl: true,
          showLayersControl: false,
          showGotoControl: false,
          showFrame: false,
          showZoomControl: true,
          showProjectionControl: false,
        });
      } else {
        aladinRef.current.gotoRaDec(targetRA, targetDEC);
        aladinRef.current.setFoV(maxFov);
      }

      // Draw FOV overlay only when coordinates are provided
      if (hasCoordinates) {
        setTimeout(() => drawOverlay(targetRA, targetDEC, fovW, fovH), 600);
      }
    } catch (e) {
      console.error("Aladin init error:", e);
    }
  }, [ready, ra, dec, focalLength, sensor, positionAngle, panes, isMosaic, hasCoordinates]);

  const drawOverlay = useCallback((centerRA: number, centerDEC: number, fovW: number, fovH: number) => {
    if (!aladinRef.current || !window.A) return;

    // Remove previous overlay
    if (overlayRef.current) {
      try { overlayRef.current.removeAll(); } catch (_) {}
    }

    const overlay = window.A.graphicOverlay({ color: "#00ff88", lineWidth: 2 });
    aladinRef.current.addOverlay(overlay);
    overlayRef.current = overlay;

    const drawRect = (cRA: number, cDEC: number, w: number, h: number, angle: number, color: string) => {
      const angleRad = (angle * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      const cosDec = Math.cos((cDEC * Math.PI) / 180);

      const hw = w / 2;
      const hh = h / 2;

      const corners = [
        [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
      ];

      const raDecCorners = corners.map(([dx, dy]) => {
        const rotX = dx * cosA - dy * sinA;
        const rotY = dx * sinA + dy * cosA;
        const cornerDec = cDEC + rotY;
        const cosCornerDec = Math.cos((cornerDec * Math.PI) / 180);
        return [cRA + rotX / cosCornerDec, cornerDec];
      });

      raDecCorners.push(raDecCorners[0]); // Close polygon

      try {
        const polyline = window.A.polyline(raDecCorners, { color, lineWidth: 2 });
        overlay.add(polyline);
      } catch (e) {
        console.error("Polyline error:", e);
      }
    };

    if (isMosaic && panes && panes.length > 0) {
      panes.forEach((pane, i) => {
        const pRA = parseRA(pane.ra);
        const pDEC = parseDEC(pane.dec);
        if (pRA !== null && pDEC !== null) {
          const angle = pane.position_angle ?? positionAngle ?? 0;
          const hue = (i * 360) / panes.length;
          drawRect(pRA, pDEC, fovW, fovH, angle, `hsl(${hue}, 80%, 60%)`);
        }
      });
    } else {
      drawRect(centerRA, centerDEC, fovW, fovH, positionAngle || 0, "#00ff88");
    }
  }, [positionAngle, panes, isMosaic]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Setup</Label>
          {setups && setups.length > 0 ? (
            <Select value={setupName || ""} onValueChange={(v) => onSetupChange?.(v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Sélectionner un setup" />
              </SelectTrigger>
              <SelectContent>
                {setups.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                    {s.focal_length ? ` — ${s.focal_length}mm` : ""}
                    {s.sensorWidthMm && s.sensorHeightMm
                      ? ` / ${s.sensorWidthMm.toFixed(1)}×${s.sensorHeightMm.toFixed(1)}mm`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={sensor} onValueChange={setSensor}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(sensorOptions).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      {!isMosaic && (ra || dec) && (
        <p className="text-xs text-muted-foreground font-mono">
          RA {ra || "—"} · Dec {dec || "—"} · Rotation {positionAngle || 0}°
        </p>
      )}
      <div
        ref={containerRef}
        className="w-full rounded-md overflow-hidden border border-border"
        style={{ height: 400 }}
      />
      {!ready && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Chargement de la carte du ciel...
        </p>
      )}
      {(!ra || !dec) && ready && (
        <p className="text-xs text-muted-foreground text-center">
          Vue initiale (M31). Saisissez des coordonnées RA/DEC pour centrer le cadre sur votre cible.
        </p>
      )}
    </div>
  );
};

export default SkyViewer;
