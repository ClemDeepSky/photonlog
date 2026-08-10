import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Telescope, Calendar, Trash2, Grid3X3, User, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import placeholder from "@/assets/project-placeholder.jpg";

const Projects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, teams(name, logo_url), project_acquisitions(acquired, kept, quantity, exposure_duration)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projet supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const statusLabels: Record<string, string> = {
    active: "Actif",
    completed: "Terminé",
    paused: "En pause",
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projets</h1>
            <p className="text-muted-foreground mt-1">Organisez vos projets d'acquisition</p>
          </div>
          <Button onClick={() => navigate("/projects/new")}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau projet
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-12" />
              </Card>
            ))}
          </div>
        ) : projects?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="group hover:border-primary/50 transition-colors">
                <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
                  <img
                    src={(project as any).image_url || placeholder}
                    alt={`Vignette du projet ${project.name}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {(project as any).teams?.logo_url ? (
                        <img src={(project as any).teams.logo_url} alt="Team logo" className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                          {project.team_id ? <FolderOpen className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {project.name}
                          {project.is_mosaic && <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {(project as any).teams?.name || "Personnel"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {statusLabels[project.status] || project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {project.ra && project.dec && (
                        <span className="flex items-center gap-1">
                          <Telescope className="h-3 w-3" /> {project.ra} / {project.dec}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(project.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => navigate(`/projects/${project.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => deleteProject.mutate(project.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Aucun projet</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                Créez votre premier projet d'acquisition pour commencer à organiser vos sessions.
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

export default Projects;
