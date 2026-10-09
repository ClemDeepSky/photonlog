import AppLayout from "@/components/AppLayout";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/duration";
import { computeProgress, batchesFromPlanCounters, colorForFilter, type PlanLine } from "@/lib/progress";
import {
  batchesOf,
  convertProjectToV2,
  ensureContribution,
  fetchSessions,
  formatNightRange,
  rebuildAutomaticSessions,
  sessionFilters,
  sessionSeconds,
  sessionSubs,
  type Contribution,
  type TrackingMode,
} from "@/lib/sessions";
import SessionDialog from "@/components/v2/SessionDialog";
import FolderRefresh from "@/components/frames/FolderRefresh";
import QualitySection from "@/components/frames/QualitySection";
import { ArrowLeft, CalendarPlus, Grid3X3, Settings, Trash2, Users } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  team_id: string | null;
  created_by: string;
  is_mosaic: boolean;
  setup: string | null;
  folder_path: string | null;
  filename_pattern: string | null;
  target_object: string | null;
  schema_version: number;
  tracking_mode: TrackingMode;
  teams: { name: string } | null;
}

const ProjectWorkspace = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["v2-project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, description, status, team_id, created_by, is_mosaic, setup, folder_path, filename_pattern, target_object, schema_version, tracking_mode, teams(name)"
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as Project;
    },
    enabled: !!id,
  });

  const { data: plan } = useQuery({
    queryKey: ["v2-plan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_acquisitions")
        .select("id, filter, exposure_duration, quantity, acquired, target_seconds, bin, pane_id")
        .eq("project_id", id!)
        .order("filter", { ascending: true });
      if (error) throw error;
      return data as (PlanLine & { bin: number })[];
    },
    enabled: !!id,
  });

  const { data: panes } = useQuery({
    queryKey: ["v2-panes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_panes")
        .select("id, pane_number, ra, dec")
        .eq("project_id", id!)
        .order("pane_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ["v2-sessions", id],
    queryFn: () => fetchSessions(id!),
    enabled: !!id,
  });

  const { data: contributions } = useQuery({
    queryKey: ["v2-contributions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_contributions")
        .select("id, project_id, user_id, tracking_mode, setup, folder_path, filename_pattern")
        .eq("project_id", id!);
      if (error) throw error;
      return data as Contribution[];
    },
    enabled: !!id,
  });

  const { data: profiles } = useQuery({
    queryKey: ["v2-contributor-profiles", id, contributions?.length],
    queryFn: async () => {
      const ids = Array.from(new Set((contributions || []).map((c) => c.user_id)));
      if (!ids.length) return {} as Record<string, string>;
      const { data, error } = await supabase.from("profiles").select("id, username").in("id", ids);
      if (error) throw error;
      return Object.fromEntries((data || []).map((p) => [p.id, p.username])) as Record<string, string>;
    },
    enabled: !!contributions?.length,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["v2-sessions", id] });
    queryClient.invalidateQueries({ queryKey: ["v2-plan", id] });
    queryClient.invalidateQueries({ queryKey: ["v2-project", id] });
    queryClient.invalidateQueries({ queryKey: ["v2-contributions", id] });
    queryClient.invalidateQueries({ queryKey: ["v2-all-batches"] });
    queryClient.invalidateQueries({ queryKey: ["v2-projects"] });
  };

  const activate = useMutation({
    mutationFn: async (mode: TrackingMode) => {
      if (!project) return;
      await convertProjectToV2(project, mode);
    },
    onSuccess: () => {
      toast({ title: "Projet activé en V2", description: "Vos données V1 sont intactes." });
      refreshAll();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const myContribution = (contributions || []).find((c) => c.user_id === user?.id) || null;

  const ensureMine = useMutation({
    mutationFn: async (mode: TrackingMode) => {
      if (!project || !user) return;
      const contribution = await ensureContribution(project.id, user.id, {
        tracking_mode: mode,
        setup: project.setup,
        folder_path: project.folder_path,
        filename_pattern: project.filename_pattern,
      });
      await supabase
        .from("project_contributions")
        .update({ tracking_mode: mode })
        .eq("id", contribution.id);
      if (!project.team_id) {
        await supabase.from("projects").update({ tracking_mode: mode }).eq("id", project.id);
      }
    },
    onSuccess: () => {
      toast({ title: "Méthode de contribution mise à jour" });
      refreshAll();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const syncAuto = useMutation({
    mutationFn: async () => {
      if (!project || !user) return { sessions: 0, subs: 0 };
      const contribution = await ensureContribution(project.id, user.id, {
        tracking_mode: "automatic",
        setup: project.setup,
        folder_path: project.folder_path,
        filename_pattern: project.filename_pattern,
      });
      return rebuildAutomaticSessions(project.id, contribution.id);
    },
    onSuccess: (result) => {
      toast({
        title: "Sessions reconstruites",
        description: `${result?.sessions ?? 0} session(s), ${result?.subs ?? 0} poses.`,
      });
      refreshAll();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("project_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Session supprimée" });
      refreshAll();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !project) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Chargement du projet…</p>
      </AppLayout>
    );
  }

  const isV2 = project.schema_version >= 2;
  const mode: TrackingMode = project.team_id
    ? myContribution?.tracking_mode ?? "manual"
    : project.tracking_mode;
  const acquiredBatches = isV2
    ? batchesOf(sessions || [])
    : batchesFromPlanCounters(plan || []);
  const progress = computeProgress(plan || [], acquiredBatches);
  const ordered = [...(sessions || [])].sort(
    (a, b) => new Date(b.started_at || 0).getTime() - new Date(a.started_at || 0).getTime()
  );
  const lastSession = ordered[0] || null;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/v2/projects">
                <ArrowLeft className="h-4 w-4 mr-1" /> Projets
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {project.name}
                {project.is_mosaic && <Grid3X3 className="h-4 w-4 text-muted-foreground" />}
              </h1>
              <p className="text-xs text-muted-foreground">
                {project.teams?.name || "Projet personnel"} ·{" "}
                {isV2 ? (mode === "automatic" ? "Suivi automatique" : "Suivi manuel") : "Suivi V1"}
              </p>
            </div>
          </div>
          <Badge variant="outline">{progress.percent}% du plan</Badge>
        </div>

        {!isV2 && (
          <Card className="border-primary/40 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Activer le suivi V2 sur ce projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Vos données actuelles sont conservées : Photonlog crée simplement vos sessions à partir de ce
                qui est déjà enregistré. Le projet reste visible dans la version précédente.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => activate.mutate("manual")} disabled={activate.isPending}>
                  Suivi manuel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => activate.mutate("automatic")}
                  disabled={activate.isPending}
                >
                  Suivi automatique (dossier local)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="quality">Qualité</TabsTrigger>
            {project.team_id && <TabsTrigger value="members">Contributions</TabsTrigger>}
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* VUE D'ENSEMBLE */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Temps acquis", value: formatDuration(progress.acquiredSeconds), strong: true },
                { label: "Objectif", value: formatDuration(progress.targetSeconds) },
                { label: "Restant", value: formatDuration(progress.remainingSeconds) },
                { label: "Sessions", value: String(ordered.length) },
              ].map((tile) => (
                <Card key={tile.label} className="border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{tile.label}</p>
                    <p className={tile.strong ? "text-2xl font-bold text-gradient" : "text-xl font-semibold"}>
                      {tile.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Progression par filtre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={progress.percent} className="h-2 mb-3" />
                {progress.byFilter.length ? (
                  progress.byFilter.map((f) => (
                    <div key={f.filter} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-10 text-right font-semibold shrink-0"
                        style={{ color: colorForFilter(f.filter) }}
                      >
                        {f.filter}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${f.percent}%`, backgroundColor: colorForFilter(f.filter) }}
                        />
                      </div>
                      <span className="w-36 text-right text-muted-foreground shrink-0">
                        {formatDuration(f.acquiredSeconds)} / {formatDuration(f.targetSeconds)}
                      </span>
                      <span className="w-20 text-right text-muted-foreground shrink-0">{f.acquiredSubs} poses</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun plan d'acquisition défini.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dernière session</CardTitle>
              </CardHeader>
              <CardContent>
                {lastSession ? (
                  <p className="text-sm">
                    <span className="font-semibold">{formatNightRange(lastSession.started_at, lastSession.ended_at)}</span>{" "}
                    · {formatDuration(sessionSeconds(lastSession))} · {sessionSubs(lastSession)} poses ·{" "}
                    {sessionFilters(lastSession).join(" + ") || "—"}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune session enregistrée pour le moment.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PLAN */}
          <TabsContent value="plan" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Plan d'acquisition</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/projects/${project.id}/edit`}>
                    <Settings className="h-3.5 w-3.5 mr-1" /> Modifier
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan?.length ? (
                  plan.map((line) => {
                    const paneNumber = panes?.find((p) => p.id === line.pane_id)?.pane_number;
                    const filterProgress = progress.byFilter.find((f) => f.filter === line.filter);
                    return (
                      <div
                        key={line.id}
                        className="flex flex-wrap items-center gap-3 p-2 rounded-md bg-secondary/30 text-sm"
                      >
                        <span
                          className="w-10 text-center font-semibold"
                          style={{ color: colorForFilter(line.filter) }}
                        >
                          {line.filter}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {line.quantity} × {line.exposure_duration}s · Bin {line.bin}
                          {paneNumber != null && ` · Panneau ${paneNumber}`}
                        </span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          Objectif {formatDuration(Number(line.quantity) * Number(line.exposure_duration))}
                          {filterProgress ? ` · acquis ${formatDuration(filterProgress.acquiredSeconds)}` : ""}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucun filtre planifié. Modifiez le projet pour définir votre plan.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SESSIONS */}
          <TabsContent value="sessions" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {mode === "manual" ? (
                <Button
                  onClick={async () => {
                    if (!user) return;
                    if (!myContribution) await ensureMine.mutateAsync("manual");
                    setSessionDialogOpen(true);
                  }}
                >
                  <CalendarPlus className="h-4 w-4 mr-1" /> Nouvelle session
                </Button>
              ) : (
                <>
                  <FolderRefresh
                    projectId={project.id}
                    pattern={myContribution?.filename_pattern || project.filename_pattern}
                    isMosaic={project.is_mosaic}
                    acquisitions={(plan || []).map((a) => ({
                      id: a.id,
                      filter: a.filter,
                      exposure: a.exposure_duration != null ? Number(a.exposure_duration) : null,
                      paneNumber: a.pane_id ? panes?.find((p) => p.id === a.pane_id)?.pane_number ?? null : null,
                    }))}
                    onDone={() => syncAuto.mutate()}
                  />
                  <Button variant="ghost" size="sm" onClick={() => syncAuto.mutate()} disabled={syncAuto.isPending}>
                    Reconstruire les sessions
                  </Button>
                </>
              )}
            </div>

            {ordered.length ? (
              <div className="space-y-2">
                {ordered.map((session) => (
                  <Card key={session.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {formatNightRange(session.started_at, session.ended_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(sessionSeconds(session))} · {sessionSubs(session)} poses ·{" "}
                            {sessionFilters(session).join(" + ") || "—"}
                            {project.team_id && ` · ${profiles?.[
                              (contributions || []).find((c) => c.id === session.contribution_id)?.user_id || ""
                            ] || "Contributeur"}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {session.source === "automatic" ? "Automatique" : "Manuelle"}
                          </Badge>
                          {session.source === "manual" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Supprimer la session"
                              onClick={() => deleteSession.mutate(session.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(session.session_batches || []).map((b) => (
                          <span
                            key={b.id}
                            className="text-xs px-2 py-0.5 rounded bg-secondary/50"
                            style={{ color: colorForFilter(b.filter) }}
                          >
                            {b.filter} : {b.sub_count} × {b.exposure_duration}s
                          </span>
                        ))}
                      </div>
                      {session.note && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{session.note}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-border/50 border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  {mode === "manual"
                    ? "Aucune session. Ajoutez votre première nuit d'acquisition."
                    : "Aucune session détectée. Actualisez depuis votre dossier local."}
                </CardContent>
              </Card>
            )}

            {myContribution && (
              <SessionDialog
                open={sessionDialogOpen}
                onOpenChange={setSessionDialogOpen}
                projectId={project.id}
                contributionId={myContribution.id}
                planOptions={(plan || []).map((p) => ({
                  id: p.id,
                  filter: p.filter,
                  exposure_duration: Number(p.exposure_duration),
                  bin: p.bin,
                  pane_id: p.pane_id ?? null,
                }))}
                onSaved={refreshAll}
              />
            )}
          </TabsContent>

          {/* QUALITÉ */}
          <TabsContent value="quality" className="mt-4">
            {mode === "automatic" ? (
              <QualitySection projectId={project.id} isMosaic={project.is_mosaic} />
            ) : (
              <Card className="border-border/50 border-dashed">
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  L'analyse détaillée (FWHM, HFR, excentricité, étoiles, température) nécessite des brutes
                  indexées. Ce projet est suivi manuellement, aucun fichier n'est analysé.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* CONTRIBUTIONS (équipe) */}
          {project.team_id && (
            <TabsContent value="members" className="space-y-3 mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" /> Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(contributions || []).length ? (
                    (contributions || []).map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md bg-secondary/30 text-sm"
                      >
                        <span className="font-medium">
                          {profiles?.[c.user_id] || "Contributeur"}
                          {c.user_id === user?.id && " (vous)"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {c.setup || "Setup non renseigné"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {c.tracking_mode === "automatic" ? "Automatique" : "Manuel"}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune contribution enregistrée.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ma méthode de contribution</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button
                    variant={mode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => ensureMine.mutate("manual")}
                    disabled={ensureMine.isPending}
                  >
                    Manuel
                  </Button>
                  <Button
                    variant={mode === "automatic" ? "default" : "outline"}
                    size="sm"
                    onClick={() => ensureMine.mutate("automatic")}
                    disabled={ensureMine.isPending}
                  >
                    Automatique
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* PARAMÈTRES */}
          <TabsContent value="settings" className="space-y-3 mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Cible : </span>
                  {project.target_object || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Setup : </span>
                  {myContribution?.setup || project.setup || "—"}
                </p>
                {mode === "automatic" && (
                  <>
                    <p>
                      <span className="text-muted-foreground">Dossier local : </span>
                      {myContribution?.folder_path || project.folder_path || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Convention de nommage : {myContribution?.filename_pattern || project.filename_pattern || "déduite automatiquement"}
                    </p>
                  </>
                )}
                {project.description && <p className="text-muted-foreground pt-2">{project.description}</p>}
              </CardContent>
            </Card>

            {!project.team_id && isV2 && (
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mode de suivi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Un projet personnel est suivi soit manuellement, soit automatiquement. Changer de mode ne
                    supprime aucune donnée.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant={mode === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => ensureMine.mutate("manual")}
                      disabled={ensureMine.isPending}
                    >
                      Manuel
                    </Button>
                    <Button
                      variant={mode === "automatic" ? "default" : "outline"}
                      size="sm"
                      onClick={() => ensureMine.mutate("automatic")}
                      disabled={ensureMine.isPending}
                    >
                      Automatique
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button asChild variant="outline">
              <Link to={`/projects/${project.id}/edit`}>
                <Settings className="h-4 w-4 mr-1" /> Modifier le projet et son plan
              </Link>
            </Button>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppLayout>
  );
};

export default ProjectWorkspace;
