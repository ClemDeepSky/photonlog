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
} from "recharts";

interface FrameRow {
  id: string;
  filter: string | null;
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
  return d.toISOString().slice(0, 10);
};

const QualitySection = ({ projectId, isMosaic }: { projectId: string; isMosaic: boolean }) => {
  const queryClient = useQueryClient();
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set<MetricKey>(["fwhm", "eccentricity"])
  );
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [offPanes, setOffPanes] = useState<Set<string>>(new Set());
  const [offNights, setOffNights] = useState<Set<string>>(new Set());

  const { data: frames, isLoading } = useQuery({
    queryKey: ["project-frames", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_frames")
        .select("id, filter, pane_number, captured_at, fwhm, eccentricity, hfr, star_count, sensor_temp, file_name, relative_path")
        .eq("project_id", projectId)
        .order("captured_at", { ascending: true })
        .limit(20000);
      if (error) throw error;
      return data as FrameRow[];
    },
    enabled: !!projectId,
  });

  const withDates = useMemo(
    () => (frames || []).filter((f): f is FrameRow & { captured_at: string } => Boolean(f.captured_at)),
    [frames]
  );

  const availableFilters = useMemo(
    () => Array.from(new Set(withDates.map((f) => f.filter).filter(Boolean) as string[])).sort(),
    [withDates]
  );
  const availablePanes = useMemo(
    () => Array.from(new Set(withDates.map((f) => f.pane_number).filter((p) => p != null) as number[])).sort((a, b) => a - b),
    [withDates]
  );
  useEffect(() => {
    if (availableFilters.length === 0) {
      setSelectedFilter(null);
      return;
    }
    if (!selectedFilter || !availableFilters.includes(selectedFilter)) {
      setSelectedFilter(availableFilters[0]);
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
  const { series, totalPoints, nightRanges } = useMemo(() => {
    const indexed: Array<{ idx: number; f: FrameRow & { captured_at: string } }> = [];
    for (const f of withDates) {
      const filter = f.filter || "?";
      if (selectedFilter && filter !== selectedFilter) continue;
      if (f.pane_number != null && offPanes.has(String(f.pane_number))) continue;
      indexed.push({ idx: 0, f });
    }
    indexed.sort(
      (a, b) => new Date(a.f.captured_at).getTime() - new Date(b.f.captured_at).getTime()
    );
    indexed.forEach((item, i) => (item.idx = i));
    const kept = indexed.filter(({ f }) => !offNights.has(nightOf(f.captured_at)));

    const metricSeries = METRICS.filter((item) => activeMetrics.has(item.key)).map((item) => {
      const values = kept
        .map(({ f }) => f[item.key])
        .filter((value): value is number => value != null && Number.isFinite(value));
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
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
      totalPoints: indexed.length,
      nightRanges: Array.from(ranges.values()),
    };
  }, [withDates, selectedFilter, activeMetrics, offPanes, offNights]);

  // Zoom horizontal à la molette : fenêtre visible [zMin, zMax] sur les indices.
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  useEffect(() => setZoom(null), [selectedFilter, activeMetrics, offPanes, offNights, totalPoints]);
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
      const cur = zoomRef.current || [0, n - 1];
      const span = cur[1] - cur[0] + 1;
      const factor = Math.exp(dy * 0.002);
      const nextSpan = Math.min(n, Math.max(5, span * factor));
      if (nextSpan === span) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const anchor = cur[0] + frac * (span - 1);
      let z0 = anchor - frac * (nextSpan - 1);
      let z1 = z0 + nextSpan - 1;
      if (z0 < 0) { z1 -= z0; z0 = 0; }
      if (z1 > n - 1) { z0 -= z1 - (n - 1); z1 = n - 1; }
      z0 = Math.max(0, z0);
      setZoom(z0 <= 0 && z1 >= n - 1 ? null : [z0, z1]);
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
    const initial: [number, number] = zoom || [0, totalPoints - 1];
    dragRef.current = { mode, pointerId: e.pointerId, startX: e.clientX, initial };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const moveOverviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bar = overviewRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !bar || totalPoints < 2) return;
    const delta = ((e.clientX - drag.startX) / Math.max(1, bar.getBoundingClientRect().width)) * totalPoints;
    const minSpan = Math.min(5, totalPoints);
    let [start, end] = drag.initial;
    if (drag.mode === "move") {
      const span = end - start;
      start += delta;
      end += delta;
      if (start < 0) { end = span; start = 0; }
      if (end > totalPoints - 1) { start = totalPoints - 1 - span; end = totalPoints - 1; }
    } else if (drag.mode === "start") {
      start = Math.max(0, Math.min(end - minSpan + 1, start + delta));
    } else {
      end = Math.min(totalPoints - 1, Math.max(start + minSpan - 1, end + delta));
    }
    setZoom(start <= 0 && end >= totalPoints - 1 ? null : [start, end]);
  };

  const endOverviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
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
  const overviewDenominator = Math.max(1, totalPoints);
  const overviewStart = ((zoom?.[0] ?? 0) / overviewDenominator) * 100;
  const overviewEnd = (((zoom?.[1] ?? Math.max(0, totalPoints - 1)) + 1) / overviewDenominator) * 100;
  const overviewWidth = totalPoints < 2 ? 100 : Math.max(1.5, overviewEnd - overviewStart);

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
              {availableFilters.map((filter) => (
                <Button
                  key={filter}
                  role="tab"
                  aria-selected={selectedFilter === filter}
                  size="sm"
                  variant={selectedFilter === filter ? "default" : "ghost"}
                  className="h-7 min-w-8 px-2 text-xs"
                  onClick={() => setSelectedFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
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
                    Molette de la souris : zoom horizontal
                    {zoom ? ` — ${Math.round(zoom[1] - zoom[0] + 1)} images affichées sur ${totalPoints}` : ""}
                  </p>
                  {zoom && (
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setZoom(null)}>
                      Réinitialiser le zoom
                    </Button>
                  )}
                </div>
                <div ref={chartWrapRef} className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 12, left: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      {nightRanges.map((range, index) => (
                        <ReferenceArea
                          key={range.night}
                          x1={Math.max(0, range.start - 0.45)}
                          x2={Math.min(Math.max(0, totalPoints - 1), range.end + 0.45)}
                          fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--accent))"}
                          fillOpacity={0.055}
                          strokeOpacity={0}
                        />
                      ))}
                      <XAxis
                        type="number"
                        dataKey="x"
                        domain={zoom ? [zoom[0], zoom[1]] : [0, Math.max(0, totalPoints - 1)]}
                        allowDataOverflow
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={() => ""}
                        label={{ value: "Images (date puis heure)", position: "insideBottom", offset: -6, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        width={42}
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
                          onClick={(p: any) => openFrame(p?.relativePath, p?.fileName)}
                        />
                      ))}
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
                      const off = offNights.has(range.night);
                      return (
                        <button
                          key={range.night}
                          type="button"
                          onClick={() => toggle(offNights, range.night, setOffNights)}
                          className={
                            "absolute inset-y-0 border-r border-border/60 text-[9px] leading-none text-foreground transition-opacity hover:opacity-100 " +
                            (index % 2 === 0 ? "bg-primary/10 " : "bg-accent/10 ") +
                            (off ? "opacity-30 line-through" : "opacity-100")
                          }
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${new Date(`${range.night}T12:00:00`).toLocaleDateString("fr-FR")} · ${range.count} image${range.count > 1 ? "s" : ""}`}
                        >
                          <span className="flex h-full w-full items-center justify-center px-1">
                            {new Date(`${range.night}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
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
