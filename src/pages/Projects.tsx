import { skyThumbnailUrl } from "@/lib/skyThumb";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Telescope, Calendar, Trash2, Grid3X3, User, Pencil, Camera, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import placeholder from "@/assets/project-placeholder.jpg";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

const Projects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, teams(name, logo_url), project_acquisitions(acquired, quantity, exposure_duration)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: editableIds = [] } = useQuery({
    queryKey: ["editable-projects", user?.id, projects?.map((p) => p.id)],
    enabled: !!user && !!projects,
    queryFn: async () => {
      const results = await Promise.all((projects ?? []).map(async (project) => {
        if (!project.team_id) return project.created_by === user?.id ? project.id : null;
        const { data, error } = await supabase.rpc("can_edit_project", { _project_id: project.id });
        return !error && data ? project.id : null;
      }));
      return results.filter((id): id is string => id !== null);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("projects").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Projet non supprimé : vous n’avez pas l’autorisation de supprimer ce projet, ou il n’existe plus.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setPendingDelete(null);
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
                    src={(project as any).image_url || skyThumbnailUrl((project as any).ra, (project as any).dec) || placeholder}
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

                  {/* Acquisition summary */}
                  {(() => {
                    const acqs = (project as any).project_acquisitions || [];
                    const acquired = acqs.reduce((s: number, a: any) => s + (a.acquired || 0), 0);
                    const quantity = acqs.reduce((s: number, a: any) => s + (a.quantity || 0), 0);
                    const seconds = acqs.reduce((s: number, a: any) => s + (a.acquired || 0) * (a.exposure_duration || 0), 0);
                    const percent = quantity > 0 ? Math.min(100, Math.round((acquired / quantity) * 100)) : 0;
                    if (quantity === 0) return null;
                    return (
                      <div className="mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Camera className="h-3 w-3" />
                            {acquired} / {quantity} acquises
                          </span>
                          <span className="text-muted-foreground">{percent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-3">
                          <span>{Math.round(seconds / 60)} min d'intégration</span>
                        </p>
                      </div>
                    );
                  })()}

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
                      {editableIds.includes(project.id) && <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        aria-label={`Supprimer le projet ${project.name}`}
                        onClick={() => setPendingDelete({ id: project.id, name: project.name })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>}
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
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open && !deleteProject.isPending) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {pendingDelete?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Le projet, son plan, ses sessions et l’index de ses acquisitions seront définitivement supprimés. Les fichiers de votre dossier local ne seront pas touchés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProject.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={deleteProject.isPending} onClick={(event) => { event.preventDefault(); if (pendingDelete) deleteProject.mutate(pendingDelete.id); }}>
              {deleteProject.isPending ? "Suppression…" : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Projects;
