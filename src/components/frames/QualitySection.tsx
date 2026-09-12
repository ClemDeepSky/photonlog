import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
}

const METRICS = [
  { key: "fwhm", label: "FWHM" },
  { key: "eccentricity", label: "Excentricité" },
  { key: "hfr", label: "HFR" },
  { key: "star_count", label: "Étoiles" },
  { key: "sensor_temp", label: "Température" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

const filterColors: Record<string, string> = {
  L: "hsl(var(--foreground))",
  R: "hsl(0, 72%, 55%)",
  G: "hsl(142, 71%, 45%)",
  B: "hsl(217, 91%, 60%)",
  Ha: "hsl(0, 85%, 60%)",
  OIII: "hsl(192, 91%, 54%)",
  SII: "hsl(35, 92%, 55%)",
};

const nightOf = (iso: string) => {
  // Une nuit = la date du soir : avant midi, on rattache au jour précédent.
  const d = new Date(iso);
  if (d.getHours() < 12) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const QualitySection = ({ projectId, isMosaic }: { projectId: string; isMosaic: boolean }) => {
  const [metric, setMetric] = useState<MetricKey>("fwhm");
  const [offFilters, setOffFilters] = useState<Set<string>>(new Set());
  const [offPanes, setOffPanes] = useState<Set<string>>(new Set());
  const [offNights, setOffNights] = useState<Set<string>>(new Set());

  const { data: frames, isLoading } = useQuery({
    queryKey: ["project-frames", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_frames")
        .select("id, filter, pane_number, captured_at, fwhm, eccentricity, hfr, star_count, sensor_temp")
        .eq("project_id", projectId)
        .order("captured_at", { ascending: true })
        .limit(20000);
      if (error) throw error;
      return data as FrameRow[];
    },
    enabled: !!projectId,
  });

  const withDates = useMemo(() => (frames || []).filter((f) => f.captured_at), [frames]);

  const availableFilters = useMemo(
    () => Array.from(new Set(withDates.map((f) => f.filter).filter(Boolean) as string[])).sort(),
    [withDates]
  );
  const availablePanes = useMemo(
    () => Array.from(new Set(withDates.map((f) => f.pane_number).filter((p) => p != null) as number[])).sort((a, b) => a - b),
    [withDates]
  );
  const availableNights = useMemo(
    () => Array.from(new Set(withDates.map((f) => nightOf(f.captured_at!)))).sort(),
    [withDates]
  );

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const series = useMemo(() => {
    const byFilter = new Map<string, { x: number; y: number; label: string }[]>();
    for (const f of withDates) {
      const value = f[metric];
      if (value == null) continue;
      const filter = f.filter || "?";
      if (offFilters.has(filter)) continue;
      if (f.pane_number != null && offPanes.has(String(f.pane_number))) continue;
      if (offNights.has(nightOf(f.captured_at!))) continue;
      const x = new Date(f.captured_at!).getTime();
      if (!byFilter.has(filter)) byFilter.set(filter, []);
      byFilter.get(filter)!.push({
        x,
        y: Number(value),
        label: new Date(f.captured_at!).toLocaleString("fr-FR"),
      });
    }
    return Array.from(byFilter.entries())
      .map(([filter, points]) => ({ filter, points: points.sort((a, b) => a.x - b.x) }))
      .sort((a, b) => a.filter.localeCompare(b.filter));
  }, [withDates, metric, offFilters, offPanes, offNights]);

  const hasMetricData = series.some((s) => s.points.length > 0);
  const metricLabel = METRICS.find((m) => m.key === metric)!.label;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LineChart className="h-4 w-4 text-primary" />
            Qualité des brutes
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {METRICS.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={metric === m.key ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
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
            <div className="space-y-2">
              {availableFilters.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Filtres</span>
                  {availableFilters.map((f) => (
                    <Badge
                      key={f}
                      variant={offFilters.has(f) ? "outline" : "secondary"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggle(offFilters, f, setOffFilters)}
                      style={!offFilters.has(f) ? { color: filterColors[f] } : undefined}
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              )}

              {isMosaic && availablePanes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Panneaux</span>
                  {availablePanes.map((p) => (
                    <Badge
                      key={p}
                      variant={offPanes.has(String(p)) ? "outline" : "secondary"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggle(offPanes, String(p), setOffPanes)}
                    >
                      P{p}
                    </Badge>
                  ))}
                </div>
              )}

              {availableNights.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">Nuits</span>
                  {availableNights.map((n) => (
                    <Badge
                      key={n}
                      variant={offNights.has(n) ? "outline" : "secondary"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggle(offNights, n, setOffNights)}
                    >
                      {new Date(n).toLocaleDateString("fr-FR")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {hasMetricData ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => new Date(v).toLocaleDateString("fr-FR")}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={metricLabel}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: any, name: any) => [value, name === "y" ? metricLabel : name]}
                      labelFormatter={(v) => new Date(Number(v)).toLocaleString("fr-FR")}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {series.map((s) => (
                      <Scatter
                        key={s.filter}
                        name={s.filter}
                        data={s.points}
                        line={{ strokeWidth: 1 }}
                        fill={filterColors[s.filter] || "hsl(var(--primary))"}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune valeur de {metricLabel.toLowerCase()} dans les noms de fichiers indexés.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualitySection;
