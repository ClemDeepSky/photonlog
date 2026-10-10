import { skyThumbnailUrl } from "@/lib/skyThumb";
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
import { computeProgress, batchesFromPlanCounters, type AcquiredBatch, type PlanLine } from "@/lib/progress";
import { FolderOpen, Grid3X3, Users, User } from "lucide-react";
import projectPlaceholder from "@/assets/project-placeholder.jpg";
import DeleteDemoButton from "@/components/projects/DeleteDemoButton";
import { DEMO_PROJECT_NAME } from "@/lib/demoProject";

interface ProjectRow {
  id: string;
  created_by: string;
  name: string;
  status: string;
  team_id: string | null;
  is_mosaic: boolean;
  image_url: string | null;
  target_object: string | null;
  schema_version: number;
  tracking_mode: string;
  teams: { name: string } | null;
  project_acquisitions: PlanLine[];
}

const ProjectsV2 = () => {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["v2-projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, created_by, name, status, team_id, is_mosaic, image_url, ra, dec, target_object, schema_version, tracking_mode, teams(name), project_acquisitions(id, filter, exposure_duration, quantity, acquired, target_seconds, pane_id)"
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

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Projets</h1>
            <p className="text-muted-foreground mt-1">Chaque projet regroupe son plan, ses sessions et sa qualité</p>
          </div>
          <Button asChild>
            <Link to="/projects/new">Nouveau projet</Link>
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : projects?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const acquired =
                project.schema_version >= 2
                  ? (batches || []).filter((b) => b.project_id === project.id)
                  : batchesFromPlanCounters(project.project_acquisitions || []);
              const progress = computeProgress(project.project_acquisitions || [], acquired);
              return (
                <Card key={project.id} className="border-border/50 overflow-hidden hover:border-primary/50 transition-colors">
                  <Link to={`/v2/projects/${project.id}`}>
                    <img
                      src={project.image_url || skyThumbnailUrl((project as any).ra, (project as any).dec) || projectPlaceholder}
                      alt={`Aperçu du projet ${project.name}`}
                      loading="lazy"
                      className="h-32 w-full object-cover"
                    />
                  </Link>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          <Link to={`/v2/projects/${project.id}`} className="hover:text-primary">
                            {project.name}
                          </Link>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {project.team_id ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                          {project.teams?.name || "Personnel"}
                          {project.is_mosaic && <Grid3X3 className="h-3 w-3 ml-1" />}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="outline" className="shrink-0">{progress.percent}%</Badge>
                        {project.created_by === user?.id && !project.team_id && project.name === DEMO_PROJECT_NAME && <DeleteDemoButton id={project.id} name={project.name} />}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={progress.percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDuration(progress.acquiredSeconds)} / {formatDuration(progress.targetSeconds)} ·{" "}
                      {progress.acquiredSubs} poses
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-14 w-14 text-muted-foreground mb-3" />
              <h2 className="text-xl font-semibold mb-1">Aucun projet</h2>
              <p className="text-muted-foreground">Créez votre premier projet pour commencer le suivi.</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default ProjectsV2;
