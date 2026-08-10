import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, Layers, Target, Timer, Hourglass, Camera, CheckCircle2 } from "lucide-react";
import { formatDuration } from "@/lib/duration";

export interface StatAcquisition {
  filter: string;
  quantity: number;
  acquired: number;
  kept: number;
  exposure_duration: number;
}

interface Props {
  acquisitions: StatAcquisition[];
  projectCount: number;
  activeCount: number;
  filterColors: Record<string, string>;
}

const StatsOverview = ({ acquisitions, projectCount, activeCount, filterColors }: Props) => {
  const acquiredSeconds = acquisitions.reduce((s, a) => s + a.acquired * Number(a.exposure_duration || 0), 0);
  const keptSeconds = acquisitions.reduce((s, a) => s + a.kept * Number(a.exposure_duration || 0), 0);
  const plannedSeconds = acquisitions.reduce((s, a) => s + a.quantity * Number(a.exposure_duration || 0), 0);
  const remainingSeconds = acquisitions.reduce(
    (s, a) => s + Math.max(0, a.quantity - a.kept) * Number(a.exposure_duration || 0),
    0
  );
  const acquiredFrames = acquisitions.reduce((s, a) => s + a.acquired, 0);
  const keptFrames = acquisitions.reduce((s, a) => s + a.kept, 0);
  const plannedFrames = acquisitions.reduce((s, a) => s + a.quantity, 0);
  const avgExposure = keptFrames > 0 ? Math.round(keptSeconds / keptFrames) : acquiredFrames > 0 ? Math.round(acquiredSeconds / acquiredFrames) : 0;
  const globalAcquiredPercent = plannedSeconds > 0 ? Math.min(100, Math.round((acquiredSeconds / plannedSeconds) * 100)) : 0;
  const globalKeptPercent = plannedSeconds > 0 ? Math.min(100, Math.round((keptSeconds / plannedSeconds) * 100)) : 0;

  const byFilter = Object.entries(
    acquisitions.reduce<Record<string, { acquired: number; kept: number; planned: number }>>((acc, a) => {
      const dur = Number(a.exposure_duration || 0);
      acc[a.filter] = acc[a.filter] || { acquired: 0, kept: 0, planned: 0 };
      acc[a.filter].acquired += a.acquired * dur;
      acc[a.filter].kept += a.kept * dur;
      acc[a.filter].planned += a.quantity * dur;
      return acc;
    }, {})
  )
    .map(([filter, v]) => ({ filter, ...v }))
    .sort((a, b) => b.kept - a.kept || b.acquired - a.acquired);

  const maxFilter = byFilter[0]?.kept || byFilter[0]?.acquired || 0;
  const keptOverAcquired = keptFrames > acquiredFrames;

  const tiles = [
    { icon: Camera, label: "Frames acquises", value: `${acquiredFrames} / ${plannedFrames}` },
    { icon: CheckCircle2, label: "Frames conservées", value: `${keptFrames} / ${plannedFrames}`, highlight: true },
    { icon: Clock, label: "Intégration acquise", value: formatDuration(acquiredSeconds) },
    { icon: CheckCircle2, label: "Intégration conservée", value: formatDuration(keptSeconds), highlight: true },
    { icon: Target, label: "Intégration visée", value: formatDuration(plannedSeconds) },
    { icon: Hourglass, label: "Restant à acquérir", value: formatDuration(remainingSeconds) },
    { icon: Timer, label: "Pose moyenne", value: avgExposure > 0 ? `${avgExposure}s` : "—" },
    { icon: Layers, label: "Projets", value: `${activeCount} actifs / ${projectCount}` },
  ];

  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {tiles.map(({ icon: Icon, label, value, highlight }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="truncate">{label}</span>
              </div>
              <p className={highlight ? "text-2xl font-bold text-gradient" : "text-xl font-semibold"}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statistiques d'intégration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between mb-1.5 text-xs text-muted-foreground">
              <span>Avancement global (frames conservées / visée)</span>
              <span className="text-foreground font-semibold">{globalKeptPercent}%</span>
            </div>
            <Progress value={globalKeptPercent} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {globalAcquiredPercent}% acquis bruts
            </p>
          </div>

          {keptOverAcquired && (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Le nombre de frames conservées dépasse le nombre de frames acquises. Vérifiez vos saisies.</span>
            </div>
          )}

          {byFilter.length > 0 ? (
            <div className="space-y-2">
              {byFilter.map(({ filter, acquired, kept, planned }) => (
                <div key={filter} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-10 font-semibold text-right shrink-0"
                    style={{ color: filterColors[filter] || "hsl(var(--muted-foreground))" }}
                  >
                    {filter}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all absolute left-0 top-0 opacity-40"
                      style={{
                        width: `${maxFilter > 0 ? (acquired / maxFilter) * 100 : 0}%`,
                        backgroundColor: filterColors[filter] || "hsl(var(--primary))",
                      }}
                    />
                    <div
                      className="h-full rounded-full transition-all absolute left-0 top-0"
                      style={{
                        width: `${maxFilter > 0 ? (kept / maxFilter) * 100 : 0}%`,
                        backgroundColor: filterColors[filter] || "hsl(var(--primary))",
                      }}
                    />
                  </div>
                  <span className="w-40 text-right shrink-0 text-muted-foreground">
                    {formatDuration(kept)} / {formatDuration(planned)} ({formatDuration(acquired)} acq.)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune acquisition enregistrée pour le moment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsOverview;
