import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getProjectDirHandle,
  ensureReadPermission,
  ensureWritePermission,
  deleteFileFromHandle,
  getFileFromHandle,
  requestProjectDirHandle,
} from "@/lib/dirHandleStore";
import { getCachedProjectFile } from "@/lib/localFileCache";
import FramePreviewDialog from "@/components/frames/FramePreviewDialog";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

// Ordre L R V B S H O, couleur de fond = bande passante du filtre
const DARK = "hsl(222, 47%, 8%)";
const LIGHT = "hsl(0, 0%, 100%)";
const BANDS: { keys: string[]; order: number; bg: string; fg: string }[] = [
  { keys: ["L", "LUM", "LUMINANCE", "CLEAR", "C"], order: 0, bg: "hsl(0, 0%, 92%)", fg: DARK },
  { keys: ["R", "RED"], order: 1, bg: "hsl(0, 75%, 50%)", fg: LIGHT },
  { keys: ["V", "G", "GREEN", "VERT"], order: 2, bg: "hsl(130, 65%, 40%)", fg: LIGHT },
  { keys: ["B", "BLUE", "BLEU"], order: 3, bg: "hsl(220, 85%, 55%)", fg: LIGHT },
  { keys: ["S", "SII", "S2", "SULFUR"], order: 4, bg: "hsl(350, 80%, 32%)", fg: LIGHT },
  { keys: ["H", "HA", "HALPHA", "H-ALPHA"], order: 5, bg: "hsl(355, 85%, 45%)", fg: LIGHT },
  { keys: ["O", "OIII", "O3", "OXYGEN"], order: 6, bg: "hsl(180, 75%, 45%)", fg: DARK },
];
const filterBand = (name: string) => {
  const k = name.trim().toUpperCase();
  return BANDS.find((b) => b.keys.includes(k)) ?? { order: 99, bg: "hsl(var(--secondary))", fg: "hsl(var(--foreground))" };
};

interface FrameRow {
  id: string;
  filter: string | null;
  exposure_duration: number | null;
  pane_number: number | null;
  captured_at: string | null;
  fwhm: number | null;
  eccentricity: number | null;
  hfr: number | null;
  star_count: number | null;
  sensor_temp: number | null;
  file_name: string | null;
  relative_path: string | null;
}

const METRICS = [
  { key: "fwhm", label: "FWHM", color: "hsl(var(--primary))" },
  { key: "eccentricity", label: "Excentricité", color: "hsl(var(--accent))" },
  { key: "hfr", label: "HFR", color: "hsl(var(--foreground))" },
  { key: "star_count", label: "Étoiles", color: "hsl(var(--destructive))" },
  { key: "sensor_temp", label: "Température", color: "hsl(var(--muted-foreground))" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const nightOf = (iso: string) => {
  // Une nuit = la date du soir : avant midi, on rattache au jour précédent.
  const d = new Date(iso);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Une couleur distincte par nuit (angle d'or pour bien séparer les teintes voisines).
const nightColor = (index: number) => `hsl(${Math.round((index * 137.5) % 360)} 70% 55%)`;

// Libellé « 09→10/10/26 » : soir → matin.
const nightLabel = (night: string) => {
  const start = new Date(`${night}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const dd = (d: Date) => String(d.getDate()).padStart(2, "0");
  const tail = end.toLocaleDateString("fr-FR", { month: "2-digit", year: "2-digit" });
  return start.getMonth() === end.getMonth()
    ? `${dd(start)}→${dd(end)}/${tail}`
    : `${start.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}→${dd(end)}/${tail}`;
};
const nightTitle = (night: string) => {
  const start = new Date(`${night}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return `Nuit du ${start.toLocaleDateString("fr-FR")} au ${end.toLocaleDateString("fr-FR")}`;
};

// Phase de la lune pour une nuit (date du soir, évaluée à minuit).
// Référence : nouvelle lune du 6 janvier 2000 18:14 UTC, mois synodique 29,530588853 j.
const SYNODIC_MONTH = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
const MOON_SYMBOLS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const moonPhase = (night: string) => {
  const days = (Date.parse(`${night}T00:00:00Z`) - NEW_MOON_REF) / 86_400_000;
  const phase = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH / SYNODIC_MONTH;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const symbol = MOON_SYMBOLS[Math.round(phase * 8) % 8];
  return { illumination, symbol };
};

const QualitySection = ({ projectId, isMosaic }: { projectId: string; isMosaic: boolean }) => {
  const queryClient = useQueryClient();
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set<MetricKey>(["fwhm", "eccentricity"])
  );
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [offPanes, setOffPanes] = useState<Set<string>>(new Set());
  

  const { data: frames, isLoading } = useQuery({
    queryKey: ["project-frames", projectId],
    queryFn: async () => {
      const all: FrameRow[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("project_frames")
          .select("id, filter, exposure_duration, pane_number, captured_at, fwhm, eccentricity, hfr, star_count, sensor_temp, file_name, relative_path")
          .eq("project_id", projectId)
          .order("captured_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        all.push(...((data || []) as FrameRow[]));
        if (!data || data.length < PAGE) break;
      }
      return all;
    },
    enabled: !!projectId,
  });

  const withDates = useMemo(
    () => (frames || []).filter((f): f is FrameRow & { captured_at: string } => Boolean(f.captured_at)),
    [frames]
  );

  const frameGroupKey = (f: FrameRow) => JSON.stringify([f.filter, f.exposure_duration]);
  const availableFilters = useMemo(() => {
    const groups = new Map<string, { key: string; filter: string; exposure: number | null }>();
    for (const f of withDates) {
      if (!f.filter) continue;
      const key = frameGroupKey(f);
      groups.set(key, { key, filter: f.filter, exposure: f.exposure_duration });
    }
    return Array.from(groups.values()).sort((a, b) =>
      filterBand(a.filter).order - filterBand(b.filter).order ||
      a.filter.localeCompare(b.filter) ||
      (a.exposure ?? Infinity) - (b.exposure ?? Infinity)
    );
  }, [withDates]);
  const availablePanes = useMemo(
    () => Array.from(new Set(withDates.map((f) => f.pane_number).filter((p) => p != null) as number[])).sort((a, b) => a - b),
    [withDates]
  );
  useEffect(() => {
    if (availableFilters.length === 0) {
      setSelectedFilter(null);
      return;
    }
    if (!selectedFilter || !availableFilters.some((group) => group.key === selectedFilter)) {
      setSelectedFilter(availableFilters[0].key);
    }
  }, [availableFilters, selectedFilter]);

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((current) => {
      if (current.has(key) && current.size === 1) return current;
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Distribution régulière : chaque image conserve sa place, même si sa nuit est masquée.
  const { series, metricRanges, totalPoints, nightRanges } = useMemo(() => {
    const indexed: Array<{ idx: number; f: FrameRow & { captured_at: string } }> = [];
    for (const f of withDates) {
      if (selectedFilter && frameGroupKey(f) !== selectedFilter) continue;
      if (f.pane_number != null && offPanes.has(String(f.pane_number))) continue;
      indexed.push({ idx: 0, f });
    }
    indexed.sort(
      (a, b) => new Date(a.f.captured_at).getTime() - new Date(b.f.captured_at).getTime()
    );
    indexed.forEach((item, i) => (item.idx = i));
    const kept = indexed;

    const metricRanges: Partial<Record<MetricKey, { min: number; max: number }>> = {};
    const metricSeries = METRICS.filter((item) => activeMetrics.has(item.key)).map((item) => {
      const values = kept
        .map(({ f }) => f[item.key])
        .filter((value): value is number => value != null && Number.isFinite(value));
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      metricRanges[item.key] = { min, max };
      const spread = max - min;
      const points = kept.flatMap(({ idx, f }) => {
        const value = f[item.key];
        if (value == null || !Number.isFinite(value)) return [];
        return [{
          x: idx,
          y: spread === 0 ? 50 : ((Number(value) - min) / spread) * 100,
          actualValue: Number(value),
          metricKey: item.key,
          metricLabel: item.label,
          capturedAt: f.captured_at,
          fileName: f.file_name || f.relative_path || "",
          relativePath: f.relative_path || "",
          fwhm: f.fwhm,
          hfr: f.hfr,
          eccentricity: f.eccentricity,
          starCount: f.star_count,
          sensorTemp: f.sensor_temp,
        }];
      });
      return { ...item, points };
    });

    const ranges = new Map<string, { night: string; start: number; end: number; count: number }>();
    for (const { idx, f } of indexed) {
      const night = nightOf(f.captured_at);
      const existing = ranges.get(night);
      if (existing) {
        existing.end = idx;
        existing.count += 1;
      } else {
        ranges.set(night, { night, start: idx, end: idx, count: 1 });
      }
    }

    return {
      series: metricSeries,
      metricRanges,
      totalPoints: indexed.length,
      nightRanges: Array.from(ranges.values()),
    };
  }, [withDates, selectedFilter, activeMetrics, offPanes]);

  // Zoom horizontal : fenêtre continue [x0, x1] en unités d'index (bords à -0.5 / n-0.5).
  const MIN_SPAN = 2;
  const fullWindow = (n: number): [number, number] => [-0.5, n - 0.5];
  const clampZoom = (start: number, end: number, n: number): [number, number] | null => {
    if (n < 2) return null;
    const lo = -0.5;
    const hi = n - 0.5;
    const span = Math.min(n, Math.max(Math.min(MIN_SPAN, n), end - start));
    if (span >= n - 1e-6) return null;
    let s = start;
    let e = start + span;
    if (s < lo) { s = lo; e = lo + span; }
    if (e > hi) { e = hi; s = hi - span; }
    return [s, e];
  };

  const frameNight = (start: number, end: number, n: number): [number, number] | null => {
    if (n < 2) return null;
    const lo = -0.5;
    const hi = n - 0.5;
    const s = Math.max(lo, start - 0.5);
    const e = Math.min(hi, end + 0.5);
    if (s <= lo && e >= hi) return null;
    return [s, e];
  };

  const [zoom, setZoom] = useState<[number, number] | null>(null);
  useEffect(() => setZoom(null), [selectedFilter, activeMetrics, offPanes, totalPoints]);
  const [drag, setDrag] = useState<{ start: number; cur: number } | null>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  useEffect(() => setSelection(null), [selectedFilter, offPanes, totalPoints]);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const totalRef = useRef(totalPoints);
  totalRef.current = totalPoints;

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const n = totalRef.current;
      if (n < 2) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const cur = zoomRef.current || fullWindow(n);
      const span = cur[1] - cur[0];
      const factor = Math.exp(dy * 0.002);
      const nextSpan = Math.min(n, Math.max(Math.min(MIN_SPAN, n), span * factor));
      if (Math.abs(nextSpan - span) < 1e-6) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const anchor = cur[0] + frac * span;
      const z0 = anchor - frac * nextSpan;
      setZoom(clampZoom(z0, z0 + nextSpan, n));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [totalPoints > 0]);

  const dragRef = useRef<{
    mode: "move" | "start" | "end";
    pointerId: number;
    startX: number;
    initial: [number, number];
  } | null>(null);

  const startOverviewDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: "move" | "start" | "end"
  ) => {
    if (totalPoints < 2) return;
    e.preventDefault();
    e.stopPropagation();
    const initial: [number, number] = zoom || fullWindow(totalPoints);
    dragRef.current = { mode, pointerId: e.pointerId, startX: e.clientX, initial };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveOverviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bar = overviewRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !bar || totalPoints < 2) return;
    const delta = ((e.clientX - drag.startX) / Math.max(1, bar.getBoundingClientRect().width)) * totalPoints;
    const minSpan = Math.min(MIN_SPAN, totalPoints);
    let [start, end] = drag.initial;
    if (drag.mode === "move") {
      start += delta;
      end += delta;
    } else if (drag.mode === "start") {
      start = Math.min(end - minSpan, start + delta);
    } else {
      end = Math.max(start + minSpan, end + delta);
    }
    setZoom(clampZoom(start, end, totalPoints));
  };

  const endOverviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const target = e.target as HTMLElement;
    if (target?.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
  };


  const [preview, setPreview] = useState<{ file: File; path: string } | null>(null);

  // Ouverture d'une brute depuis le dossier local mémorisé.
  const openFrame = async (relativePath?: string, fileName?: string) => {
    if (!relativePath) return;
    // 1) Fichiers gardés en mémoire lors du dernier rafraîchissement.
    const cached = getCachedProjectFile(projectId, relativePath, fileName);
    if (cached) {
      setPreview({ file: cached, path: relativePath });
      return;
    }
    // 2) Accès au dossier mémorisé (Chrome/Edge, hors aperçu intégré).
    const handle = await getProjectDirHandle(projectId);
    if (!handle) {
      toast({
        title: "Dossier non mémorisé",
        description:
          "Cliquez d'abord sur « Rafraîchir le dossier » et choisissez le dossier du projet : les fichiers pourront ensuite être ouverts.",
      });
      return;
    }
    const ok = await ensureReadPermission(handle);
    if (!ok) {
      toast({
        title: "Accès refusé",
        description: "Autorisez la lecture du dossier pour ouvrir les fichiers.",
        variant: "destructive",
      });
      return;
    }
    const file = await getFileFromHandle(handle, relativePath);
    if (!file) {
      toast({
        title: "Fichier introuvable",
        description: `${fileName || relativePath} n'est plus à cet emplacement dans le dossier.`,
        variant: "destructive",
      });
      return;
    }
    setPreview({ file, path: relativePath });
  };

  // Suppression définitive du fichier sur le disque + désindexation.
  const deleteFrame = async (relativePath: string) => {
    let handle = await getProjectDirHandle(projectId);
    if (!handle) {
      // Le rafraîchissement a pu se faire sans mémoriser le dossier (aperçu intégré) :
      // on demande le dossier maintenant pour autoriser la suppression sur le disque.
      try {
        handle = await requestProjectDirHandle(projectId);
      } catch (err: any) {
        const msg = String(err?.message || "");
        const aborted = err?.name === "AbortError";
        if (!aborted) {
          toast({
            title: "Suppression indisponible ici",
            description:
              err?.name === "NotSupportedError"
                ? "Utilisez Chrome ou Edge pour supprimer un fichier du disque."
                : "Ouvrez la page dans un nouvel onglet (hors aperçu intégré) puis désignez le dossier du projet.",
            variant: "destructive",
          });
        }
        return;
      }
    }

    const ok = await ensureWritePermission(handle);
    if (!ok) {
      toast({
        title: "Autorisation refusée",
        description: "La modification du dossier est nécessaire pour supprimer le fichier.",
        variant: "destructive",
      });
      return;
    }
    const removed = await deleteFileFromHandle(handle, relativePath);
    if (!removed) {
      toast({
        title: "Suppression impossible",
        description: "Le fichier n'a pas pu être supprimé (introuvable ou verrouillé).",
        variant: "destructive",
      });
      return;
    }

    // Désindexation + recomptage de l'acquisition concernée.
    const { data: rows } = await supabase
      .from("project_frames")
      .select("id, acquisition_id")
      .eq("project_id", projectId)
      .eq("relative_path", relativePath);
    const acquisitionIds = Array.from(
      new Set((rows || []).map((r: any) => r.acquisition_id).filter(Boolean))
    ) as string[];
    await supabase.from("project_frames").delete().eq("project_id", projectId).eq("relative_path", relativePath);

    for (const acqId of acquisitionIds) {
      const { count } = await supabase
        .from("project_frames")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("acquisition_id", acqId);
      await supabase.from("project_acquisitions").update({ acquired: count || 0 }).eq("id", acqId);
    }

    queryClient.invalidateQueries({ queryKey: ["project-frames", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-acquisitions"] });
    queryClient.invalidateQueries({ queryKey: ["acquisitions"] });
    toast({ title: "Fichier supprimé", description: relativePath });
  };


  const hasMetricData = series.some((s) => s.points.length > 0);

  // Axe Y : valeurs réelles (min/max) des mesures cochées au lieu de pourcentages.
  const fmtMetric = (key: MetricKey, v: number) => {
    if (key === "star_count") return String(Math.round(v));
    if (key === "eccentricity") return v.toFixed(2);
    return v.toFixed(1);
  };
  const activeRangeMetrics = METRICS.filter((m) => activeMetrics.has(m.key) && metricRanges[m.key]);
  const multiMetric = activeRangeMetrics.length > 1;
  const minLabels = activeRangeMetrics.map((m) => fmtMetric(m.key, metricRanges[m.key]!.min));
  const maxLabels = activeRangeMetrics.map((m) => fmtMetric(m.key, metricRanges[m.key]!.max));
  const axisWidth = Math.max(
    42,
    Math.min(72, Math.max(...minLabels.map((l) => l.length), ...maxLabels.map((l) => l.length)) * 6.2 + 10)
  );
  // Étiquette empilée (une ligne par mesure) pour plusieurs mesures cochées.
  const MultiMetricTick = ({ x, y, payload }: any) => {
    const isTop = payload.value === 100;
    const arr = isTop ? maxLabels : payload.value === 0 ? minLabels : null;
    if (!arr) return null;
    const lineH = 11;
    const startY = isTop ? y : y - (arr.length - 1) * lineH;
    return (
      <text x={x} y={startY} textAnchor="end" fontSize={10}>
        {arr.map((t, i) => (
          <tspan key={i} x={x} dy={i === 0 ? 0 : lineH} fill={activeRangeMetrics[i].color}>
            {t}
          </tspan>
        ))}
      </text>
    );
  };

  const overviewDenominator = Math.max(1, totalPoints);
  const zoomWindow = zoom || fullWindow(Math.max(1, totalPoints));
  const visibleNightRanges = nightRanges.filter(
    (range) => range.end + 0.5 > zoomWindow[0] && range.start - 0.5 < zoomWindow[1]
  );
  const overviewStart = Math.max(0, ((zoomWindow[0] + 0.5) / overviewDenominator) * 100);
  const overviewEnd = Math.min(100, ((zoomWindow[1] + 0.5) / overviewDenominator) * 100);
  const overviewWidth = totalPoints < 2 ? 100 : Math.max(1.5, overviewEnd - overviewStart);
  const visibleCount = zoom
    ? Math.max(1, Math.round(Math.min(totalPoints, zoom[1]) - Math.max(-0.5, zoom[0])))
    : totalPoints;

  // Plot area: YAxis width axisWidth on the left, margin right 16
  const pxToX = (px: number) => {
    const w = chartWrapRef.current?.clientWidth || 1;
    const plotW = Math.max(1, w - axisWidth - 16);
    const ratio = Math.min(1, Math.max(0, (px - axisWidth) / plotW));
    return zoomWindow[0] + ratio * (zoomWindow[1] - zoomWindow[0]);
  };
  const localX = (e: React.PointerEvent) => e.clientX - (chartWrapRef.current?.getBoundingClientRect().left || 0);
  const localY = (e: React.PointerEvent) => e.clientY - (chartWrapRef.current?.getBoundingClientRect().top || 0);
  const xToPx = (x: number) => {
    const w = chartWrapRef.current?.clientWidth || 1;
    const plotW = Math.max(1, w - axisWidth - 16);
    const ratio = (x - zoomWindow[0]) / (zoomWindow[1] - zoomWindow[0]);
    return axisWidth + ratio * plotW;
  };
  // Hauteur du graphique : h-80 (320px), marges top 8 / bottom 12, axe X 30px, domaine Y [0, 100].
  const yToPx = (y: number) => 8 + (1 - y / 100) * (320 - 8 - 12 - 30);

  const onDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const x = localX(e);
    setDrag({ start: x, cur: x });
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (drag) setDrag({ ...drag, cur: localX(e) });
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (!drag) return;
    const end = localX(e);
    if (Math.abs(end - drag.start) > 4) {
      const a = pxToX(Math.min(drag.start, end));
      const b = pxToX(Math.max(drag.start, end));
      setSelection([a, b]);
    } else {
      // Clic simple (déplacement ≤ 4px) : ouvre la brute du point le plus proche.
      const cx = end;
      const cy = localY(e);
      let best: { path: string; name: string; dist: number } | null = null;
      for (const s of series) {
        for (const p of s.points) {
          if (p.x < zoomWindow[0] || p.x > zoomWindow[1]) continue;
          const dist = Math.hypot(xToPx(p.x) - cx, yToPx(p.y) - cy);
          if (!best || dist < best.dist) {
            best = { path: p.relativePath, name: p.fileName, dist };
          }
        }
      }
      if (best && best.dist <= 15) openFrame(best.path, best.name);
    }
    setDrag(null);
  };

  const selectedFrames = (() => {
    if (!selection) return [];
    const byX = new Map<number, (typeof series)[number]["points"][number]>();
    for (const s of series) for (const p of s.points) {
      if (p.x >= selection[0] && p.x <= selection[1] && !byX.has(p.x)) byX.set(p.x, p);
    }
    return Array.from(byX.values()).sort((a, b) => a.x - b.x);
  })();

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Qualité des brutes
          </CardTitle>
          {availableFilters.length > 0 && (
            <div className="flex max-w-full flex-wrap justify-end gap-1" role="tablist" aria-label="Filtre affiché">
              {availableFilters.map((group) => {
                const band = filterBand(group.filter);
                const active = selectedFilter === group.key;
                return (
                  <Button
                    key={group.key}
                    variant="ghost"
                    size="sm"
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`h-7 min-w-8 rounded-md px-2 text-xs font-semibold transition-all ${
                      active ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-80"
                    }`}
                    style={{ backgroundColor: band.bg, color: band.fg }}
                    onClick={() => setSelectedFilter(group.key)}
                  >
                    {group.filter} · {group.exposure == null ? "durée inconnue" : `${group.exposure.toLocaleString("fr-FR")} s`}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs text-muted-foreground">Mesures</span>
          {METRICS.map((item) => {
            const checkboxId = `quality-${projectId}-${item.key}`;
            return (
              <label key={item.key} htmlFor={checkboxId} className="flex cursor-pointer items-center gap-1.5 text-xs">
                <Checkbox
                  id={checkboxId}
                  checked={activeMetrics.has(item.key)}
                  onCheckedChange={() => toggleMetric(item.key)}
                  className="h-3.5 w-3.5"
                  aria-label={`Afficher ${item.label}`}
                />
                <span style={{ color: item.color }}>{item.label}</span>
              </label>
            );
          })}
        </div>
        {isMosaic && availablePanes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs text-muted-foreground">Panneaux</span>
            {availablePanes.map((pane) => {
              const paneKey = String(pane);
              const checkboxId = `quality-${projectId}-pane-${pane}`;
              return (
                <label key={pane} htmlFor={checkboxId} className="flex cursor-pointer items-center gap-1.5 text-xs">
                  <Checkbox
                    id={checkboxId}
                    checked={!offPanes.has(paneKey)}
                    onCheckedChange={() => toggle(offPanes, paneKey, setOffPanes)}
                    className="h-3.5 w-3.5"
                  />
                  P{pane}
                </label>
              );
            })}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : withDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune donnée de qualité pour ce projet. Renseignez le modèle de nommage dans le projet, puis
            rafraîchissez le dossier : les mesures présentes dans les noms de fichiers seront extraites.
          </p>
        ) : (
          <div className="space-y-4">
            {hasMetricData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Molette : zoom horizontal · Glisser : sélectionner des images
                    {zoom ? ` — ${visibleCount} images affichées sur ${totalPoints}` : ""}
                  </p>
                  {zoom && (
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setZoom(null)}>
                      Réinitialiser le zoom
                    </Button>
                  )}
                </div>
                <div className="flex items-stretch" style={{ paddingLeft: axisWidth, paddingRight: 16 }}>
                  <div className="relative h-6 w-full select-none" aria-label="Phase de la lune par nuit">
                    {visibleNightRanges.map((range) => {
                      const index = nightRanges.findIndex((item) => item.night === range.night);
                      const mp = moonPhase(range.night);
                      const span = zoomWindow[1] - zoomWindow[0];
                      const lo = Math.max(range.start - 0.5, zoomWindow[0]);
                      const hi = Math.min(range.end + 0.5, zoomWindow[1]);
                      const left = span > 0 ? ((lo - zoomWindow[0]) / span) * 100 : 0;
                      const width = span > 0 ? Math.max(1.5, ((hi - lo) / span) * 100) : 100;
                      return (
                        <button
                          key={`moon-${range.night}`}
                          type="button"
                          onClick={() => setZoom(frameNight(range.start, range.end, totalPoints))}
                          className="absolute inset-y-0 z-10 overflow-hidden whitespace-nowrap border-r border-dashed border-muted-foreground/70 text-[11px] leading-none text-foreground transition-opacity hover:opacity-80"
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: nightColor(index).replace(")", " / 0.12)") }}
                          title={`${nightTitle(range.night)} · Lune ${mp.symbol} ${mp.illumination} % — cliquez pour zoomer sur cette nuit`}
                        >
                          <span className="flex h-full w-full items-center justify-center gap-1 px-1 leading-none">
                            <span className="text-[13px]">{mp.symbol}</span>
                            <span>{mp.illumination} %</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  ref={chartWrapRef}
                  className="relative h-80 w-full select-none"
                  onPointerDown={onDragStart}
                  onPointerMove={onDragMove}
                  onPointerUp={onDragEnd}
                  onPointerLeave={() => setDrag(null)}
                >
                  {drag && Math.abs(drag.cur - drag.start) > 4 && (
                    <div
                      className="pointer-events-none absolute bottom-[42px] top-2 z-10 border border-primary/60 bg-primary/15"
                      style={{ left: Math.min(drag.start, drag.cur), width: Math.abs(drag.cur - drag.start) }}
                    />
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                       {visibleNightRanges.map((range) => {
                         const index = nightRanges.findIndex((item) => item.night === range.night);
                         return (
                        <ReferenceArea
                          key={range.night}
                           x1={Math.max(range.start - 0.5, zoomWindow[0])}
                           x2={Math.min(range.end + 0.5, zoomWindow[1])}
                          fill={nightColor(index)}
                          fillOpacity={0.09}
                          strokeOpacity={0}
                           ifOverflow="hidden"
                        />
                         );
                       })}
                      {visibleNightRanges.slice(1).map((range) => (
                        <ReferenceLine
                          key={`sep-${range.night}`}
                          x={range.start - 0.5}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="2 3"
                          strokeOpacity={0.7}
                          ifOverflow="hidden"
                        />
                      ))}
                      <XAxis
                        type="number"
                        dataKey="x"
                        domain={zoomWindow}
                        allowDataOverflow
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={() => ""}
                        label={{ value: "Images (date puis heure)", position: "insideBottom", offset: -6, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        tick={multiMetric ? MultiMetricTick : { fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        domain={[0, 100]}
                        ticks={multiMetric ? [0, 100] : undefined}
                        tickFormatter={
                          multiMetric
                            ? () => ""
                            : (value) => {
                                const m = activeRangeMetrics[0];
                                if (!m) return "";
                                const range = metricRanges[m.key]!;
                                return fmtMetric(m.key, range.min + (value / 100) * (range.max - range.min));
                              }
                        }
                        width={axisWidth}
                      />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0].payload;
                          const row = (label: string, v: any) =>
                            v != null ? (
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ) : null;
                          return (
                            <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-md max-w-xs space-y-0.5">
                              {p.fileName && (
                                <div className="mb-1">
                                  <div className="font-medium text-primary break-all" title={p.relativePath}>
                                    {p.fileName}
                                  </div>
                                  <div className="text-muted-foreground">Cliquez sur le point pour l'aperçu</div>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 border-b border-border pb-1 mb-1">
                                <span style={{ color: METRICS.find((item) => item.key === p.metricKey)?.color }}>
                                  {p.metricLabel}
                                </span>
                                <span className="font-medium">{p.actualValue}</span>
                              </div>
                              {p.capturedAt && (
                                <div className="text-muted-foreground">
                                  {new Date(p.capturedAt).toLocaleString("fr-FR")}
                                </div>
                              )}
                              {row("FWHM", p.fwhm)}
                              {row("HFR", p.hfr)}
                              {row("Excentricité", p.eccentricity)}
                              {row("Étoiles", p.starCount)}
                              {row("Température", p.sensorTemp)}
                            </div>
                          );
                        }}
                      />
                      {series.map((s) => (
                        <Scatter
                          key={s.key}
                          name={s.label}
                          data={s.points}
                          line={{ stroke: s.color, strokeWidth: 1.5 }}
                          fill={s.color}
                          cursor="pointer"
                        />
                      ))}
                      {selection && (
                        <ReferenceArea
                          x1={Math.max(selection[0], zoomWindow[0])}
                          x2={Math.min(selection[1], zoomWindow[1])}
                          fillOpacity={0}
                          stroke="hsl(var(--foreground))"
                          strokeDasharray="4 2"
                          strokeOpacity={0.8}
                          ifOverflow="hidden"
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1" aria-label="Vue d'ensemble du zoom">
                  <div
                    ref={overviewRef}
                    className="relative h-8 select-none overflow-hidden rounded-sm border border-border bg-muted touch-none"
                  >
                    {nightRanges.map((range, index) => {
                      const left = totalPoints < 2 ? 0 : (range.start / overviewDenominator) * 100;
                      const width = totalPoints < 2 ? 100 : Math.max(0.5, (range.count / overviewDenominator) * 100);
                      return (
                        <button
                          key={range.night}
                          type="button"
                          onClick={() => setZoom(frameNight(range.start, range.end, totalPoints))}
                          className={
                            "absolute inset-y-0 z-10 overflow-hidden whitespace-nowrap border-r border-border/60 text-[10px] leading-none text-foreground transition-opacity hover:opacity-80 border-dashed border-r-muted-foreground"
                          }
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: nightColor(index).replace(")", " / 0.22)") }}
                          title={`${nightTitle(range.night)} · ${range.count} image${range.count > 1 ? "s" : ""} — cliquez pour zoomer sur cette nuit`}
                        >
                          <span className="flex h-full w-full items-center justify-center gap-1 px-1 leading-none">
                            <span>
                              {nightLabel(range.night)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                    <div
                      role="slider"
                      aria-label="Déplacer la plage de zoom"
                      aria-valuemin={0}
                      aria-valuemax={Math.max(0, totalPoints - 1)}
                      aria-valuenow={Math.round(zoom?.[0] ?? 0)}
                      className="pointer-events-none absolute inset-y-0 z-30 rounded-sm border-2 border-primary bg-primary/15"
                      style={{ left: `${overviewStart}%`, width: `${overviewWidth}%` }}
                      onPointerMove={moveOverviewDrag}
                      onPointerUp={endOverviewDrag}
                      onPointerCancel={endOverviewDrag}
                    >
                      <div
                        className="pointer-events-auto absolute inset-x-3 top-0 h-2 cursor-grab bg-primary/30 active:cursor-grabbing"
                        onPointerDown={(e) => startOverviewDrag(e, "move")}
                      />
                      <div
                        className="pointer-events-auto absolute inset-y-0 left-0 z-30 w-3 -translate-x-1/2 cursor-ew-resize border-l-2 border-primary"
                        aria-label="Redimensionner le début du zoom"
                        onPointerDown={(e) => startOverviewDrag(e, "start")}
                      />
                      <div
                        className="pointer-events-auto absolute inset-y-0 right-0 z-30 w-3 translate-x-1/2 cursor-ew-resize border-r-2 border-primary"
                        aria-label="Redimensionner la fin du zoom"
                        onPointerDown={(e) => startOverviewDrag(e, "end")}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Début</span>
                    <span>{zoom ? "Déplacez ou redimensionnez la sélection" : "Vue complète"}</span>
                    <span>Fin</span>
                  </div>
                </div>
                {selection && (
                  <div className="rounded-md border border-border/60 bg-secondary/20 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium">
                        {selectedFrames.length} image{selectedFrames.length > 1 ? "s" : ""} sélectionnée{selectedFrames.length > 1 ? "s" : ""}
                      </p>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setSelection(null)}>
                        Effacer la sélection
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card text-muted-foreground">
                          <tr className="text-left">
                            <th className="px-2 py-1 font-normal">Fichier</th>
                            <th className="px-2 py-1 font-normal">Date</th>
                            <th className="px-2 py-1 text-right font-normal">FWHM</th>
                            <th className="px-2 py-1 text-right font-normal">HFR</th>
                            <th className="px-2 py-1 text-right font-normal">Exc.</th>
                            <th className="px-2 py-1 text-right font-normal">Étoiles</th>
                            <th className="px-2 py-1 text-right font-normal">Temp.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFrames.map((p) => (
                            <tr
                              key={p.x}
                              className="cursor-pointer border-t border-border/40 hover:bg-secondary/40"
                              onClick={() => openFrame(p.relativePath, p.fileName)}
                              title="Ouvrir l'aperçu"
                            >
                              <td className="max-w-[18rem] truncate px-2 py-1 text-primary">{p.fileName}</td>
                              <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">
                                {p.capturedAt ? new Date(p.capturedAt).toLocaleString("fr-FR") : ""}
                              </td>
                              <td className="px-2 py-1 text-right tabular-nums">{p.fwhm ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{p.hfr ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{p.eccentricity ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{p.starCount ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{p.sensorTemp ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune valeur disponible pour les mesures et sélections actives.
              </p>
            )}
          </div>
        )}
      </CardContent>
      <FramePreviewDialog
        file={preview?.file || null}
        relativePath={preview?.path || ""}
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        onDelete={preview ? () => deleteFrame(preview.path) : undefined}
      />
    </Card>
  );
};

export default QualitySection;
