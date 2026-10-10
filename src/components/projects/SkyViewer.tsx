import { useEffect, useRef, useState } from "react";

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
  onRaDecChange?: (ra: string, dec: string) => void;
  onRotationChange?: (angleDeg: number) => void;
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

const formatRaDeg = (deg: number): string => {
  let d = ((deg % 360) + 360) % 360;
  const hours = d / 15;
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 10) / 10;
  return `${h}h ${m}m ${s}s`;
};

const formatDecDeg = (deg: number): string => {
  const sign = deg < 0 ? "-" : "";
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const mFloat = (a - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 10) / 10;
  return `${sign}${d}d ${m}m ${s}s`;
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

const SkyViewer = ({ ra, dec, positionAngle = 0, panes, isMosaic, setupFocalLength, setupSensorWidthMm, setupSensorHeightMm, setupName, setups, onSetupChange, onRaDecChange, onRotationChange }: SkyViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const [wheelHint, setWheelHint] = useState(false);
  useEffect(() => {
    const el = wheelWrapRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); setWheelHint(false); return; }
      // Laisser défiler la page : la carte ne zoome qu'avec Ctrl + molette
      e.stopPropagation();
      setWheelHint(true);
      clearTimeout(t);
      t = setTimeout(() => setWheelHint(false), 1200);
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => { el.removeEventListener("wheel", onWheel, { capture: true } as any); clearTimeout(t); };
  }, []);
  const aladinRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [focalLength, setFocalLength] = useState(450);
  const [sensor, setSensor] = useState("apsc");
  const [shapes, setShapes] = useState<{ pts: [number, number][]; color: string; interactive: boolean; handle?: [number, number]; center?: [number, number] }[]>([]);
  const dragRef = useRef<any>(null);
  const selfEditRef = useRef<{ ra: string; dec: string } | null>(null);

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

  const hasCoordinates = !!(ra && dec);
  const sensorInfo = sensorOptions[sensor] || SENSORS.apsc;
  const fovW = calcFOVDeg(sensorInfo.width, focalLength);
  const fovH = calcFOVDeg(sensorInfo.height, focalLength);

  // Initialize / recenter Aladin view
  useEffect(() => {
    if (!ready || !containerRef.current || !window.A) return;

    const raDeg = parseRA(ra);
    const decDeg = parseDEC(dec);
    const targetRA = raDeg ?? 10.684;
    const targetDEC = decDeg ?? 41.269;
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
          showLayersControl: true,
          showGotoControl: false,
          showFrame: false,
          showZoomControl: true,
          showProjectionControl: false,
        });
      } else if (!selfEditRef.current || selfEditRef.current.ra !== ra || selfEditRef.current.dec !== dec) {
        // Only recenter when the change did not come from dragging the frame
        aladinRef.current.gotoRaDec(targetRA, targetDEC);
      }
    } catch (e) {
      console.error("Aladin init error:", e);
    }
  }, [ready, ra, dec, fovW, fovH]);

  // Compute the FOV frame(s) in screen space, refreshed every frame
  useEffect(() => {
    if (!ready) return;
    let raf = 0;

    const cornersFor = (cRA: number, cDEC: number, angle: number): [number, number][] | null => {
      const a = (angle * Math.PI) / 180;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const hw = fovW / 2;
      const hh = fovH / 2;
      const local: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
      const pts: [number, number][] = [];
      for (const [dx, dy] of local) {
        const rotX = dx * cosA - dy * sinA;
        const rotY = dx * sinA + dy * cosA;
        const cornerDec = cDEC + rotY;
        // Sky seen from inside: East (increasing RA) is on the LEFT, so local +x (screen right) = West.
        const cornerRA = cRA - rotX / Math.cos((cornerDec * Math.PI) / 180);
        const p = aladinRef.current?.world2pix(cornerRA, cornerDec);
        if (!p) return null;
        pts.push([p[0], p[1]]);
      }
      return pts;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!aladinRef.current) return;
      const next: typeof shapes = [];

      if (isMosaic && panes && panes.length > 0) {
        panes.forEach((pane, i) => {
          const pRA = parseRA(pane.ra);
          const pDEC = parseDEC(pane.dec);
          if (pRA === null || pDEC === null) return;
          const pts = cornersFor(pRA, pDEC, pane.position_angle ?? positionAngle ?? 0);
          if (pts) next.push({ pts, color: `hsl(${(i * 360) / panes.length}, 80%, 60%)`, interactive: false });
        });
      } else if (hasCoordinates) {
        const cRA = parseRA(ra);
        const cDEC = parseDEC(dec);
        if (cRA !== null && cDEC !== null) {
          const pts = cornersFor(cRA, cDEC, positionAngle || 0);
          const c = aladinRef.current.world2pix(cRA, cDEC);
          if (pts && c) {
            // rotation handle: above the frame (north side, rotated)
            const top: [number, number] = [(pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2];
            const handle: [number, number] = [top[0] + (top[0] - c[0]) * 0.35, top[1] + (top[1] - c[1]) * 0.35];
            next.push({ pts, color: "#00ff88", interactive: true, handle, center: [c[0], c[1]] });
          }
        }
      }
      setShapes(next);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, ra, dec, positionAngle, panes, isMosaic, hasCoordinates, fovW, fovH]);

  const localPoint = (e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return [(e as any).clientX - rect.left, (e as any).clientY - rect.top] as [number, number];
  };

  const startDrag = (mode: "move" | "rotate") => (e: React.PointerEvent) => {
    if (!aladinRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = localPoint(e);
    const w = aladinRef.current.pix2world(x, y);
    dragRef.current = {
      mode,
      startWorld: w,
      startRA: parseRA(ra) ?? 0,
      startDEC: parseDEC(dec) ?? 0,
      startPA: positionAngle || 0,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !aladinRef.current) return;
    e.preventDefault();
    const [x, y] = localPoint(e);
    const w = aladinRef.current.pix2world(x, y);
    if (!w) return;

    if (d.mode === "move") {
      let dRA = w[0] - d.startWorld[0];
      if (dRA > 180) dRA -= 360;
      if (dRA < -180) dRA += 360;
      const newRA = d.startRA + dRA;
      const newDEC = Math.max(-89.9, Math.min(89.9, d.startDEC + (w[1] - d.startWorld[1])));
      const raStr = formatRaDeg(newRA);
      const decStr = formatDecDeg(newDEC);
      selfEditRef.current = { ra: raStr, dec: decStr };
      onRaDecChange?.(raStr, decStr);
    } else {
      const cRA = parseRA(ra) ?? 0;
      const cDEC = parseDEC(dec) ?? 0;
      let dRA = w[0] - cRA;
      if (dRA > 180) dRA -= 360;
      if (dRA < -180) dRA += 360;
      const east = dRA * Math.cos((cDEC * Math.PI) / 180);
      const north = w[1] - cDEC;
      let pa = Math.atan2(east, north) * (180 / Math.PI);
      pa = Math.round(((pa % 360) + 360) % 360 * 10) / 10;
      onRotationChange?.(pa);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    setTimeout(() => { selfEditRef.current = null; }, 300);
  };

  const interactive = !isMosaic && hasCoordinates && (!!onRaDecChange || !!onRotationChange);

  return (
    <div className="space-y-3">
      {!isMosaic && (ra || dec) && (
        <p className="text-xs text-muted-foreground font-mono">
          RA {ra || "—"} · Dec {dec || "—"} · Rotation {positionAngle || 0}°
        </p>
      )}
      <div ref={wheelWrapRef} className="relative aspect-[20/13] min-h-[400px] w-full rounded-md overflow-hidden border border-border">
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60 transition-opacity ${wheelHint ? "opacity-100" : "opacity-0"}`}
        >
          <span className="rounded-md bg-card px-3 py-1.5 text-sm text-foreground border border-border">Ctrl + molette pour zoomer</span>
        </div>
        <div ref={containerRef} className="sky-viewer absolute inset-0" style={{ width: "100%", height: "100%" }} />
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: "none" }}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {shapes.map((s, i) => (
            <g key={i}>
              <polygon
                points={s.pts.map((p) => p.join(",")).join(" ")}
                fill={s.interactive ? "rgba(0,255,136,0.08)" : "none"}
                stroke={s.color}
                strokeWidth={2}
                style={{ pointerEvents: s.interactive && interactive ? "auto" : "none", cursor: "move" }}
                onPointerDown={s.interactive && interactive ? startDrag("move") : undefined}
              />
              {s.handle && s.center && interactive && (
                <>
                  <line
                    x1={(s.pts[2][0] + s.pts[3][0]) / 2}
                    y1={(s.pts[2][1] + s.pts[3][1]) / 2}
                    x2={s.handle[0]}
                    y2={s.handle[1]}
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx={s.handle[0]}
                    cy={s.handle[1]}
                    r={8}
                    fill="#0b1020"
                    stroke={s.color}
                    strokeWidth={2}
                    style={{ pointerEvents: "auto", cursor: "grab" }}
                    onPointerDown={startDrag("rotate")}
                  />
                </>
              )}
            </g>
          ))}
        </svg>
      </div>
      {!ready && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          Chargement de la carte du ciel...
        </p>
      )}
      {!hasCoordinates && !isMosaic && ready && (
        <p className="text-xs text-muted-foreground text-center">
          Vue initiale (M31). Saisissez des coordonnées RA/DEC pour centrer le cadre sur votre cible.
        </p>
      )}
      {interactive && (
        <p className="text-xs text-muted-foreground text-center">
          Glissez le cadre pour déplacer la cible, la poignée ronde pour ajuster la rotation.
        </p>
      )}
    </div>
  );
};

export default SkyViewer;
