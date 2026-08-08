import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Layers, Target, Timer, Hourglass, Camera } from "lucide-react";
import { formatDuration } from "@/lib/duration";

export interface StatAcquisition {
  filter: string;
  quantity: number;
  acquired: number;
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
  const plannedSeconds = acquisitions.reduce((s, a) => s + a.quantity * Number(a.exposure_duration || 0), 0);
  const remainingSeconds = acquisitions.reduce(
    (s, a) => s + Math.max(0, a.quantity - a.acquired) * Number(a.exposure_duration || 0),
    0
  );
  const acquiredFrames = acquisitions.reduce((s, a) => s + a.acquired, 0);
  const plannedFrames = acquisitions.reduce((s, a) => s + a.quantity, 0);
  const avgExposure = acquiredFrames > 0 ? Math.round(acquiredSeconds / acquiredFrames) : 0;
  const globalPercent = plannedSeconds > 0 ? Math.min(100, Math.round((acquiredSeconds / plannedSeconds) * 100)) : 0;

  const byFilter = Object.entries(
    acquisitions.reduce<Record<string, { acquired: number; planned: number }>>((acc, a) => {
      const dur = Number(a.exposure_duration || 0);
      acc[a.filter] = acc[a.filter] || { acquired: 0, planned: 0 };
      acc[a.filter].acquired += a.acquired * dur;
      acc[a.filter].planned += a.quantity * dur;
      return acc;
    }, {})
  )
    .map(([filter, v]) => ({ filter, ...v }))
    .sort((a, b) => b.acquired - a.acquired);

  const maxFilter = byFilter[0]?.acquired || 0;

  const tiles = [
    { icon: Clock, label: "Intégration acquise", value: formatDuration(acquiredSeconds), highlight: true },
    { icon: Target, label: "Intégration visée", value: formatDuration(plannedSeconds) },
    { icon: Hourglass, label: "Restant à acquérir", value: formatDuration(remainingSeconds) },
    { icon: Camera, label: "Frames acquises", value: `${acquiredFrames} / ${plannedFrames}` },
    { icon: Timer, label: "Pose moyenne", value: avgExposure > 0 ? `${avgExposure}s` : "—" },
    { icon: Layers, label: "Projets", value: `${activeCount} actifs / ${projectCount}` },
  ];

  return (
    <div className="mb-8 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
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
              <span>Avancement global (en temps de pose)</span>
              <span className="text-foreground font-semibold">{globalPercent}%</span>
            </div>
            <Progress value={globalPercent} className="h-2.5" />
          </div>

          {byFilter.length > 0 ? (
            <div className="space-y-1.5">
              {byFilter.map(({ filter, acquired, planned }) => (
                <div key={filter} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-10 font-semibold text-right shrink-0"
                    style={{ color: filterColors[filter] || "hsl(var(--muted-foreground))" }}
                  >
                    {filter}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${maxFilter > 0 ? (acquired / maxFilter) * 100 : 0}%`,
                        backgroundColor: filterColors[filter] || "hsl(var(--primary))",
                      }}
                    />
                  </div>
                  <span className="w-32 text-right shrink-0 text-muted-foreground">
                    {formatDuration(acquired)} / {formatDuration(planned)}
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
