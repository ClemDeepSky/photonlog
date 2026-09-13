import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { formatDuration } from "@/lib/duration";
import {
  computeProgress,
  batchesFromPlanCounters,
  colorForFilter,
  type AcquiredBatch,
  type PlanLine,
} from "@/lib/progress";
import { FolderOpen, Users, User, ArrowRight, Clock, Hourglass, Target } from "lucide-react";

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  team_id: string | null;
  schema_version: number;
  tracking_mode: string;
  target_object: string | null;
  teams: { name: string } | null;
  project_acquisitions: PlanLine[];
}

const DashboardV2 = () => {
  const { user } = useAuth();

  const { data: projects } = useQuery({
    queryKey: ["v2-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, status, team_id, schema_version, tracking_mode, target_object, teams(name), project_acquisitions(id, filter, exposure_duration, quantity, acquired, target_seconds, pane_id)"
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectRow[];
    },
    enabled: !!user,
  });

  const { data: batches } = useQuery({
    queryKey: ["v2-all-batches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_batches")
        .select("project_id, filter, exposure_duration, sub_count");
      if (error) throw error;
      return data as (AcquiredBatch & { project_id: string })[];
    },
    enabled: !!user,
  });

  const { data: lastSessions } = useQuery({
    queryKey: ["v2-last-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_sessions")
        .select("project_id, started_at")
        .not("started_at", "is", null)
        .order("started_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data || []) {
        if (!map[row.project_id!] && row.started_at) map[row.project_id!] = row.started_at;
      }
      return map;
    },
    enabled: !!user,
  });

  const batchesFor = (project: ProjectRow): AcquiredBatch[] => {
    if (project.schema_version >= 2) {
      return (batches || []).filter((b) => b.project_id === project.id);
    }
    return batchesFromPlanCounters(project.project_acquisitions || []);
  };

  const rows = (projects || []).map((project) => ({
    project,
    progress: computeProgress(project.project_acquisitions || [], batchesFor(project)),
    lastSession: lastSessions?.[project.id] || null,
  }));

  const active = rows.filter((r) => r.project.status !== "completed");
  const completed = rows.filter((r) => r.project.status === "completed");

  const totals = {
    acquired: rows.reduce((s, r) => s + r.progress.acquiredSeconds, 0),
    target: rows.reduce((s, r) => s + r.progress.targetSeconds, 0),
    remaining: rows.reduce((s, r) => s + r.progress.remainingSeconds, 0),
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Où en sont vos projets d'acquisition ?</p>
          </div>
          <Button asChild>
            <Link to="/projects/new">Nouveau projet</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { icon: Clock, label: "Temps acquis", value: formatDuration(totals.acquired), strong: true },
            { icon: Target, label: "Objectif total", value: formatDuration(totals.target) },
            { icon: Hourglass, label: "Restant", value: formatDuration(totals.remaining) },
          ].map(({ icon: Icon, label, value, strong }) => (
            <Card key={label} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
                <p className={strong ? "text-2xl font-bold text-gradient" : "text-xl font-semibold"}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-3">Projets en cours</h2>
        {active.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Aucun projet en cours pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {active.map(({ project, progress, lastSession }) => (
              <Card key={project.id} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        {project.team_id ? (
                          <Users className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.teams?.name || "Projet personnel"}
                          {project.schema_version >= 2 &&
                            ` · ${project.tracking_mode === "automatic" ? "Automatique" : "Manuel"}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">{progress.percent}%</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        {formatDuration(progress.acquiredSeconds)} / {formatDuration(progress.targetSeconds)}
                      </span>
                      <span>{formatDuration(progress.remainingSeconds)} restantes</span>
                    </div>
                    <Progress value={progress.percent} className="h-2" />
                  </div>

                  {progress.byFilter.slice(0, 5).map((f) => (
                    <div key={f.filter} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-10 text-right font-semibold shrink-0"
                        style={{ color: colorForFilter(f.filter) }}
                      >
                        {f.filter}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${f.percent}%`, backgroundColor: colorForFilter(f.filter) }}
                        />
                      </div>
                      <span className="w-32 text-right text-muted-foreground shrink-0">
                        {formatDuration(f.acquiredSeconds)} / {formatDuration(f.targetSeconds)}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-muted-foreground">
                      {lastSession
                        ? `Dernière session : ${new Date(lastSession).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}`
                        : "Aucune session enregistrée"}
                    </p>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/v2/projects/${project.id}`}>
                        Ouvrir <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mt-8 mb-3">Projets terminés</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {completed.map(({ project, progress }) => (
                <Card key={project.id} className="border-border/50">
                  <CardContent className="p-4">
                    <Link to={`/v2/projects/${project.id}`} className="font-medium hover:text-primary">
                      {project.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDuration(progress.acquiredSeconds)} d'intégration
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default DashboardV2;
