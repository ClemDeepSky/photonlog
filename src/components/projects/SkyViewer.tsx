import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
}

const SENSORS: Record<string, { width: number; height: number; label: string }> = {
  "apsc": { width: 23.5, height: 15.6, label: "APS-C (23.5×15.6mm)" },
  "ff": { width: 36, height: 24, label: "Full Frame (36×24mm)" },
  "m43": { width: 17.3, height: 13, label: "Micro 4/3 (17.3×13mm)" },
  "apsh": { width: 28.7, height: 19, label: "APS-H (28.7×19mm)" },
};

const SkyViewer = ({ ra, dec, positionAngle = 0, panes, isMosaic }: SkyViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const aladinRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [focalLength, setFocalLength] = useState(450);
  const [sensor, setSensor] = useState("apsc");

  // Load Aladin Lite script
  useEffect(() => {
    if (window.A) {
      setLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.min.js";
    script.charset = "utf-8";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Keep scripts loaded
    };
  }, []);

  // Parse RA string to degrees
  const parseRA = (raStr: string): number | null => {
    if (!raStr) return null;
    // Try "XXh YY' ZZ"" format
    const hms = raStr.match(/(\d+)\s*h[r]?\s*(\d+)[''′]\s*([\d.]+)?/i);
    if (hms) {
      const h = parseFloat(hms[1]);
      const m = parseFloat(hms[2]);
      const s = parseFloat(hms[3] || "0");
      return (h + m / 60 + s / 3600) * 15; // Convert hours to degrees
    }
    // Try decimal
    const num = parseFloat(raStr);
    if (!isNaN(num)) return num;
    return null;
  };

  // Parse DEC string to degrees
  const parseDEC = (decStr: string): number | null => {
    if (!decStr) return null;
    // Try "XX° YY' ZZ"" format
    const dms = decStr.match(/([+-]?\d+)[°º]\s*(\d+)[''′]\s*([\d.]+)?/i);
    if (dms) {
      const d = parseFloat(dms[1]);
      const m = parseFloat(dms[2]);
      const s = parseFloat(dms[3] || "0");
      const sign = d < 0 ? -1 : 1;
      return sign * (Math.abs(d) + m / 60 + s / 3600);
    }
    const num = parseFloat(decStr);
    if (!isNaN(num)) return num;
    return null;
  };

  // Calculate FOV in degrees
  const calcFOV = (sensorMm: number, focalMm: number): number => {
    return (sensorMm / focalMm) * (180 / Math.PI) * (Math.PI / 180) * (180 / Math.PI);
    // Simplified: 2 * atan(sensor / (2 * focal)) in degrees
  };

  const calcFOVDeg = (sensorMm: number, focalMm: number): number => {
    return 2 * Math.atan(sensorMm / (2 * focalMm)) * (180 / Math.PI);
  };

  // Initialize Aladin
  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    const raDeg = parseRA(ra);
    const decDeg = parseDEC(dec);

    const targetRA = raDeg ?? 10.684; // Default to M31
    const targetDEC = decDeg ?? 41.269;

    const sensorInfo = SENSORS[sensor];
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

      // Draw FOV overlay
      setTimeout(() => drawOverlay(targetRA, targetDEC, fovW, fovH), 500);
    } catch (e) {
      console.error("Aladin init error:", e);
    }
  }, [loaded, ra, dec, focalLength, sensor, positionAngle, panes, isMosaic]);

  const drawOverlay = (centerRA: number, centerDEC: number, fovW: number, fovH: number) => {
    if (!aladinRef.current || !window.A) return;

    // Remove previous overlay
    if (overlayRef.current) {
      try { aladinRef.current.removeLayer(overlayRef.current); } catch { }
    }

    const overlay = window.A.graphicOverlay({ color: "#00ff88", lineWidth: 2 });
    aladinRef.current.addOverlay(overlay);
    overlayRef.current = overlay;

    const drawRect = (cRA: number, cDEC: number, w: number, h: number, angle: number, color: string, label?: string) => {
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
        return [cRA + rotX / cosDec, cDEC + rotY];
      });

      // Close the polygon
      raDecCorners.push(raDecCorners[0]);

      try {
        const polyline = window.A.polyline(raDecCorners, { color, lineWidth: 2 });
        overlay.add(polyline);
      } catch { }
    };

    if (isMosaic && panes && panes.length > 0) {
      panes.forEach((pane, i) => {
        const pRA = parseRA(pane.ra);
        const pDEC = parseDEC(pane.dec);
        if (pRA !== null && pDEC !== null) {
          const angle = pane.position_angle ?? positionAngle ?? 0;
          const hue = (i * 360) / panes.length;
          drawRect(pRA, pDEC, fovW, fovH, angle, `hsl(${hue}, 80%, 60%)`, `P${i + 1}`);
        }
      });
    } else {
      drawRect(centerRA, centerDEC, fovW, fovH, positionAngle || 0, "#00ff88");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs">Focale (mm)</Label>
          <Input
            type="number"
            value={focalLength}
            onChange={(e) => setFocalLength(parseFloat(e.target.value) || 450)}
            className="h-8"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-xs">Capteur</Label>
          <Select value={sensor} onValueChange={setSensor}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SENSORS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full rounded-md overflow-hidden border border-border bg-black"
        style={{ height: 400 }}
      />
      {(!ra || !dec) && (
        <p className="text-xs text-muted-foreground text-center">
          Saisissez des coordonnées RA/DEC pour centrer la vue.
        </p>
      )}
    </div>
  );
};

export default SkyViewer;
