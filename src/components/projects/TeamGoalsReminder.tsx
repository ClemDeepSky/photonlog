// Projets Team : rappel en lecture seule des objectifs des autres membres.
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { filterBand } from "@/lib/filterBands";
import { useProjectContributions } from "@/lib/teamContributions";
import { useContributionPanes } from "./MyContribution";

const fmtH = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);

interface Props { projectId: string; myContributionId?: string }

const TeamGoalsReminder = ({ projectId, myContributionId }: Props) => {
  const { data: contributions = [] } = useProjectContributions(projectId);
  const { data: panes = [] } = useContributionPanes(projectId);
  const { data: lines = [] } = useQuery({
    queryKey: ["contribution-lines", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_acquisitions")
        .select("id, filter, exposure_duration, quantity, contribution_id").eq("project_id", projectId);
      if (error) throw error;
      return data;
    },
  });
  const others = contributions.filter((c) => c.id !== myContributionId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Objectifs des autres membres</CardTitle>
        <p className="text-xs text-muted-foreground">Rappel en lecture seule : chacun règle sa contribution dans sa propre page projet.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {others.length === 0 && <p className="text-sm text-muted-foreground">Aucun autre membre ne participe pour l'instant.</p>}
        {others.map((c) => {
          const own = lines.filter((l) => l.contribution_id === c.id);
          // Somme par filtre et durée de pose (tous panneaux confondus).
          const agg = new Map<string, { filter: string; exp: number; qty: number }>();
          own.forEach((l) => {
            const k = `${l.filter}|${l.exposure_duration}`;
            const e = agg.get(k) || { filter: l.filter, exp: Number(l.exposure_duration), qty: 0 };
            e.qty += l.quantity; agg.set(k, e);
          });
          const rows = [...agg.values()].sort((a, b) => (filterBand(a.filter).order - filterBand(b.filter).order) || a.exp - b.exp);
          const total = rows.reduce((s, r) => s + r.qty * r.exp, 0);
          const nPanes = panes.filter((p) => p.contribution_id === c.id).length;
          return (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="font-semibold">{c.username}</span>
                <span className="text-muted-foreground">{c.setup || "Setup non défini"}</span>
                {nPanes > 1 && <span className="text-muted-foreground">· {nPanes} panneaux</span>}
                <span className="ml-auto tabular-nums text-muted-foreground">Total {total ? fmtH(total) : "—"}</span>
              </div>
              {rows.length ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {rows.map((r) => {
                    const band = filterBand(r.filter);
                    return (
                      <span key={`${r.filter}-${r.exp}`} className="rounded border border-border/60 px-2 py-1 tabular-nums">
                        <span className="rounded px-1 font-semibold mr-1" style={{ background: band.bg, color: band.fg }}>{r.filter}</span>
                        {r.qty} × {r.exp} s · {fmtH(r.qty * r.exp)}
                      </span>
                    );
                  })}
                </div>
              ) : <p className="mt-2 text-xs text-muted-foreground">Aucun objectif défini.</p>}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TeamGoalsReminder;
