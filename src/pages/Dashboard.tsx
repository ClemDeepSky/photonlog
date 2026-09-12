import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { Users, User, Plus, Star, FolderOpen } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import StatsOverview from "@/components/dashboard/StatsOverview";
import { formatDuration } from "@/lib/duration";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Acquisition {
  filter: string;
  quantity: number;
  acquired: number;
  exposure_duration: number;
}

interface ProjectWithAcquisitions {
  id: string;
  name: string;
  team_id: string | null;
  status: string;
  teams: { name: string } | null;
  project_acquisitions: Acquisition[];
}

const filterColors: Record<string, string> = {
  L: "hsl(var(--foreground))",
  R: "hsl(0, 72%, 55%)",
  G: "hsl(142, 71%, 45%)",
  B: "hsl(217, 91%, 60%)",
  Ha: "hsl(0, 85%, 60%)",
  OIII: "hsl(192, 91%, 54%)",
  SII: "hsl(35, 92%, 55%)",
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "Astronome";

  const { data: projects, isLoading } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, team_id, status, teams(name), project_acquisitions(filter, quantity, acquired, exposure_duration)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProjectWithAcquisitions[];
    },
    enabled: !!user,
  });

  const getGlobalProgress = (acqs: Acquisition[]) => {
    if (!acqs.length) return { acquired: 0 };
    const totalTarget = acqs.reduce((s, a) => s + a.quantity * Number(a.exposure_duration || 0), 0);
    if (totalTarget === 0) return { acquired: 0 };
    const totalAcquired = acqs.reduce((s, a) => s + a.acquired * Number(a.exposure_duration || 0), 0);
    return {
      acquired: Math.min(100, Math.round((totalAcquired / totalTarget) * 100)),
    };
  };

  const getFilterProgress = (acqs: Acquisition[]) => {
    const map: Record<string, { acquired: number; quantity: number; acquiredSeconds: number; plannedSeconds: number; durationCount: number; durationSum: number }> = {};
    for (const a of acqs) {
      const dur = Number(a.exposure_duration || 0);
      if (!map[a.filter]) map[a.filter] = { acquired: 0, quantity: 0, acquiredSeconds: 0, plannedSeconds: 0, durationCount: 0, durationSum: 0 };
      map[a.filter].acquired += a.acquired;
      map[a.filter].quantity += a.quantity;
      map[a.filter].acquiredSeconds += a.acquired * dur;
      map[a.filter].plannedSeconds += a.quantity * dur;
      map[a.filter].durationCount += a.quantity;
      map[a.filter].durationSum += a.quantity * dur;
    }
    return Object.entries(map).map(([filter, { acquired, quantity, acquiredSeconds, plannedSeconds, durationCount, durationSum }]) => ({
      filter,
      acquired,
      quantity,
      acquiredSeconds,
      plannedSeconds,
      exposureDuration: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
      acquiredPercent: quantity > 0 ? Math.min(100, Math.round((acquired / quantity) * 100)) : 0,
    }));
  };

  const statusLabels: Record<string, string> = {
    active: "Actif",
    completed: "Terminé",
    paused: "En pause",
  };

  const allAcquisitions = projects?.flatMap((p) => p.project_acquisitions || []) ?? [];
  const activeCount = projects?.filter((p) => p.status === "active").length ?? 0;

  const acquiredSecondsOf = (acqs: Acquisition[]) =>
    acqs.reduce((s, a) => s + a.acquired * Number(a.exposure_duration || 0), 0);


  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Bienvenue, <span className="text-gradient">{username}</span> ✨
          </h1>
          <p className="text-muted-foreground mt-1">Votre espace d'astrophotographie</p>
        </div>

        {/* Quick start */}
        <div className="mb-8">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-primary" />
                Démarrage rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm space-y-1.5">
              <p>1. Créez ou rejoignez une <strong className="text-foreground">Team</strong></p>
              <p>2. Configurez votre <strong className="text-foreground">Matériel</strong></p>
              <p>3. Créez un <strong className="text-foreground">Projet</strong> d'acquisition</p>
              <p>4. Ajoutez vos <strong className="text-foreground">Frames</strong> au fur et à mesure</p>
            </CardContent>
          </Card>
        </div>

        {!isLoading && projects?.length ? (
          <StatsOverview
            acquisitions={allAcquisitions}
            projectCount={projects.length}
            activeCount={activeCount}
            filterColors={filterColors}
          />
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-16" />
              </Card>
            ))}
          </div>
        ) : projects?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project, i) => {
              const globalPercent = getGlobalProgress(project.project_acquisitions);
              const filters = getFilterProgress(project.project_acquisitions);

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-border/50 hover:border-primary/40 transition-all hover:shadow-glow group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
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
                            <p className="text-xs text-muted-foreground">
                              {project.teams?.name || "Personnel"}
                            </p>
                          </div>
                        </div>
                        <Badge variant={project.status === "active" ? "default" : "secondary"} className="shrink-0 text-xs">
                          {statusLabels[project.status] || project.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Global progress */}
                      <div>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">Progression globale</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gradient">{globalPercent.acquired}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-secondary overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all absolute left-0 top-0"
                            style={{ width: `${globalPercent.acquired}%`, backgroundColor: "hsl(var(--primary))" }}
                          />
                        </div>
                      </div>

                      {/* Prominent acquired time */}
                      <div className="rounded-lg bg-secondary/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Acquis</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatDuration(acquiredSecondsOf(project.project_acquisitions))}
                        </p>
                      </div>

                      {/* Per-filter progress */}
                      {filters.length > 0 && (
                        <div className="space-y-2">
                          {filters.map(({ filter, acquired, quantity, acquiredPercent, exposureDuration, acquiredSeconds, plannedSeconds }) => (
                            <div key={filter} className="space-y-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className="w-8 font-semibold text-right shrink-0"
                                  style={{ color: filterColors[filter] || "hsl(var(--muted-foreground))" }}
                                >
                                  {filter}
                                </span>
                                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden relative">
                                  <div
                                    className="h-full rounded-full transition-all absolute left-0 top-0 opacity-40"
                                    style={{
                                      width: `${acquiredPercent}%`,
                                      backgroundColor: filterColors[filter] || "hsl(var(--primary))",
                                    }}
                                  />
                                  <div
                                    className="h-full rounded-full transition-all absolute left-0 top-0"
                                    style={{
                                      width: `${percent}%`,
                                      backgroundColor: filterColors[filter] || "hsl(var(--primary))",
                                    }}
                                  />
                                </div>
                                <span className="text-muted-foreground w-20 text-right shrink-0">
                                  {kept}/{quantity}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-10 pr-24">
                                <span>{formatDuration(plannedSeconds)} visé</span>
                                <span>{exposureDuration > 0 ? `${exposureDuration}s/pose` : "—"}</span>
                                <span>{formatDuration(keptSeconds)} conservé</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add acquisitions button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full opacity-80 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/frames?project=${project.id}`)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Ajouter des acquisitions
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
              <h2 className="text-xl font-semibold mb-2">Aucun projet</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                Créez votre premier projet pour commencer à suivre vos acquisitions.
              </p>
              <Button onClick={() => navigate("/projects/new")}>
                <Plus className="h-4 w-4 mr-2" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;
