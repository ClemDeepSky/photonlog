import AppLayout from "@/components/AppLayout";
import { personalProjectFilter } from "@/lib/personalProjectScope";
import { filterBand } from "@/lib/filterBands";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ImagePlus, Minus, Plus, ChevronDown, ChevronRight, Users, User, Grid3X3 } from "lucide-react";
import FolderRefresh from "@/components/frames/FolderRefresh";
import QualitySection from "@/components/frames/QualitySection";
import { useProjectContributions } from "@/lib/teamContributions";
import { MemberAvatar, useMemberAvatars } from "@/components/MemberAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

interface Acquisition {
  id: string;
  filter: string;
  quantity: number;
  acquired: number;
  
  exposure_duration: number;
  bin: number;
  pane_id: string | null;
  contribution_id?: string | null;
}

interface Pane {
  id: string;
  pane_number: number;
  ra: string;
  dec: string;
  contribution_id: string | null;
}

interface Project {
  id: string;
  name: string;
  is_mosaic: boolean;
  team_id: string | null;
  status: string;
  filename_pattern: string | null;
  teams: { name: string; owner_id: string; management_mode: string } | null;
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

const Frames = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(searchParams.get("project"));
  const [expandedPanes, setExpandedPanes] = useState<Set<string>>(new Set(["global"]));
  const [draftsAcquired, setDraftsAcquired] = useState<Record<string, string>>({});


  const { data: projects } = useQuery({
    queryKey: ["frames-projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, is_mosaic, team_id, status, filename_pattern, teams(name, owner_id, management_mode)")
        .or(await personalProjectFilter(user?.id))
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Project[];
    },
    enabled: !!user,
  });

  const [participant, setParticipant] = useState<string>("all");
  useEffect(() => setParticipant("all"), [selectedProjectId]);

  const { data: allAcquisitions } = useQuery({
    queryKey: ["frames-acquisitions", selectedProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_acquisitions")
        .select("*")
        .eq("project_id", selectedProjectId!)
        .order("filter", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Acquisition[];
    },
    enabled: !!selectedProjectId,
  });

  const { data: panes } = useQuery({
    queryKey: ["frames-panes", selectedProjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_panes")
        .select("id, pane_number, ra, dec, contribution_id")
        .eq("project_id", selectedProjectId!)
        .order("pane_number", { ascending: true });
      if (error) throw error;
      return data as Pane[];
    },
    enabled: !!selectedProjectId,
  });

  const updateAcquired = useMutation({
    mutationFn: async ({ id, acquired }: { id: string; acquired: number }) => {
      const { error } = await supabase
        .from("project_acquisitions")
        .update({ acquired: Math.max(0, acquired) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frames-acquisitions", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-projects"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });





  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const isTeam = !!selectedProject?.team_id;
  const { data: contributions } = useProjectContributions(selectedProjectId, isTeam);
  const avatars = useMemberAvatars((contributions ?? []).map((c) => c.user_id));
  const myContribution = contributions?.find((c) => c.user_id === user?.id) ?? null;
  const team = selectedProject?.teams ?? null;
  const canEditCommon = !isTeam || (team?.management_mode === "single_admin" ? team.owner_id === user?.id : true);
  // Filtre par participant : "all" ou id de contribution. Les lignes sans
  // participant (ancien plan commun) ne sont plus affichées.
  const acquisitions = (allAcquisitions || []).filter((a) =>
    isTeam ? !!a.contribution_id && (participant === "all" || a.contribution_id === participant) : true,
  );
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["frames-acquisitions", selectedProjectId] });
    queryClient.invalidateQueries({ queryKey: ["project-frames", selectedProjectId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-projects"] });
  };
  // Le scan d'un membre ne touche que ses propres lignes et brutes.
  const scanLines = (allAcquisitions || []).filter((a) =>
    isTeam && myContribution ? a.contribution_id === myContribution.id : !a.contribution_id,
  );

  const togglePane = (paneId: string) => {
    setExpandedPanes((prev) => {
      const next = new Set(prev);
      if (next.has(paneId)) next.delete(paneId);
      else next.add(paneId);
      return next;
    });
  };

  // Keep common and personal plans separate, including single-panel plans
  // whose acquisition lines have no pane_id.
  const paneGroupKey = (acq: Acquisition) => {
    if (!isTeam) return acq.pane_id || "global";
    const owner = acq.contribution_id || "common";
    const ownPanes = (panes || []).filter((p) => p.contribution_id === acq.contribution_id);
    const paneId = acq.pane_id || (ownPanes.length === 1 ? ownPanes[0].id : "global");
    return `${owner}:${paneId}`;
  };
  const groupPane = (acqs: Acquisition[]) => {
    const first = acqs[0];
    if (!first) return undefined;
    if (first.pane_id) return panes?.find((p) => p.id === first.pane_id);
    if (!isTeam || !first.contribution_id) return undefined;
    const ownPanes = (panes || []).filter((p) => p.contribution_id === first.contribution_id);
    return ownPanes.length === 1 ? ownPanes[0] : undefined;
  };

  // Group acquisitions by participant and pane, never by panel number alone.
  const groupedAcquisitions = (() => {
    if (!acquisitions) return {};
    const groups: Record<string, Acquisition[]> = {};
    for (const acq of acquisitions) {
      const key = paneGroupKey(acq);
      if (!groups[key]) groups[key] = [];
      groups[key].push(acq);
    }
    // Tri des lignes : ordre des filtres L R V B S H O, puis durée de pose croissante
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) =>
          filterBand(a.filter).order - filterBand(b.filter).order ||
          (a.filter ?? "").localeCompare(b.filter ?? "") ||
          (a.exposure_duration ?? 0) - (b.exposure_duration ?? 0),
      );
    }
    return groups;
  })();

  // Sort pane groups by pane number ("global" group last)
  const sortedPaneEntries = Object.entries(groupedAcquisitions).sort(([, acqsA], [, acqsB]) => {
    const ownerIndex = (acqs: Acquisition[]) => {
      const cid = acqs[0]?.contribution_id;
      if (!cid) return Number.MAX_SAFE_INTEGER;
      const index = (contributions || []).findIndex((c) => c.id === cid);
      return index < 0 ? Number.MAX_SAFE_INTEGER - 1 : index;
    };
    if (isTeam && ownerIndex(acqsA) !== ownerIndex(acqsB)) return ownerIndex(acqsA) - ownerIndex(acqsB);
    const paneA = groupPane(acqsA);
    const paneB = groupPane(acqsB);
    const numA = paneA?.pane_number ?? Number.MAX_SAFE_INTEGER;
    const numB = paneB?.pane_number ?? Number.MAX_SAFE_INTEGER;
    return numA - numB;
  });

  const getGroupProgress = (acqs: Acquisition[]) => {
    const total = acqs.reduce((s, a) => s + a.quantity, 0);
    if (total === 0) return 0;
    const acquired = acqs.reduce((s, a) => s + a.acquired, 0);
    return Math.min(100, Math.round((acquired / total) * 100));
  };

  const globalAcquiredProgress = acquisitions ? getGroupProgress(acquisitions) : 0;

  const totalAcquiredExposure = acquisitions
    ? acquisitions.reduce((s, a) => s + a.acquired * a.exposure_duration, 0)
    : 0;

  const totalRemainingFrames = acquisitions
    ? acquisitions.reduce((s, a) => s + Math.max(0, a.quantity - a.acquired), 0)
    : 0;

  const formatExposure = (seconds: number) => {
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Frames</h1>
          <p className="text-muted-foreground mt-1">Suivez vos acquisitions image par image</p>
        </div>

        {!selectedProjectId ? (
          // Project selection
          <>
            <p className="text-sm text-muted-foreground mb-4">Sélectionnez un projet pour gérer ses acquisitions :</p>
            {projects?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-glow"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setExpandedPanes(new Set(["global"]));
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            {project.team_id ? <Users className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                          </div>
                          <div>
                            <CardTitle className="text-base">{project.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{project.teams?.name || "Personnel"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {project.is_mosaic && <Grid3X3 className="h-3.5 w-3.5 text-muted-foreground" />}
                          <Badge variant={project.status === "active" ? "default" : "secondary"} className="text-xs">
                            {project.status === "active" ? "Actif" : project.status === "completed" ? "Terminé" : "En pause"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-border/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <ImagePlus className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
                  <h2 className="text-xl font-semibold mb-2">Aucun projet</h2>
                  <p className="text-muted-foreground max-w-md">
                    Créez un projet d'acquisition pour commencer à suivre vos frames.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // Acquisition tracking view
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setSelectedProjectId(null)}>
                  ← Retour
                </Button>
                <div>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {selectedProject?.name}
                    {selectedProject?.is_mosaic && <Grid3X3 className="h-4 w-4 text-muted-foreground" />}
                  </h2>
                  <p className="text-xs text-muted-foreground">{selectedProject?.teams?.name || "Personnel"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedProject && (
                  <FolderRefresh
                    projectId={selectedProject.id}
                    pattern={(isTeam && myContribution?.filename_pattern) || selectedProject.filename_pattern}
                    isMosaic={selectedProject.is_mosaic}
                    contributionId={isTeam ? myContribution?.id ?? null : null}
                    acquisitions={scanLines.map((a) => ({
                      id: a.id,
                      filter: a.filter,
                      exposure: a.exposure_duration != null ? Number(a.exposure_duration) : null,
                      paneNumber: a.pane_id ? panes?.find((p) => p.id === a.pane_id)?.pane_number ?? null : null,
                    }))}
                    onDone={() => {
                      queryClient.invalidateQueries({ queryKey: ["frames-acquisitions", selectedProjectId] });
                      queryClient.invalidateQueries({ queryKey: ["project-frames", selectedProjectId] });
                      queryClient.invalidateQueries({ queryKey: ["dashboard-projects"] });
                    }}
                  />
                )}
              </div>
            </div>


            {isTeam && selectedProject && (
              <>
                {!myContribution && (
                  <p className="text-sm text-muted-foreground">
                    Pour participer, réglez votre setup, votre cadrage, vos objectifs et votre dossier dans{" "}
                    <Link to={`/projects/${selectedProject.id}/edit`} className="text-primary underline">la page du projet</Link>.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Afficher :</span>
                  <Select value={participant} onValueChange={setParticipant}>
                    <SelectTrigger className="h-8 w-56" aria-label="Participant"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Projet complet</SelectItem>
                      {(contributions || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <MemberAvatar userId={c.user_id} avatars={avatars} fallback={c.username?.[0]?.toUpperCase()} className="h-4 w-4" />
                            {c.username}{c.user_id === user?.id ? " (moi)" : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Global stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Progression acquise</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gradient">{globalAcquiredProgress}%</span>
                  </div>
                  <Progress value={globalAcquiredProgress} className="h-2 mt-2" />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Frames acquises</p>
                  <span className="text-3xl font-bold">
                    {acquisitions?.reduce((s, a) => s + a.acquired, 0) || 0}
                    <span className="text-base font-normal text-muted-foreground">
                      /{acquisitions?.reduce((s, a) => s + a.quantity, 0) || 0}
                    </span>
                  </span>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Temps d'exposition acquis</p>
                  <span className="text-3xl font-bold">{formatExposure(totalAcquiredExposure)}</span>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-1">Brutes restantes</p>
                  <span className="text-3xl font-bold">
                    {totalRemainingFrames}
                    {totalRemainingFrames > 0 && (
                      <span className="text-base font-normal text-muted-foreground"> pour atteindre l'objectif</span>
                    )}
                  </span>
                </CardContent>
              </Card>

            </div>

            {selectedProject && (
              <QualitySection
                projectId={selectedProject.id}
                isMosaic={selectedProject.is_mosaic}
                participant={participant}
                myContributionId={myContribution?.id ?? null}
                canSortCommon={canEditCommon && !(isTeam && myContribution)}
              />
            )}


            {/* Acquisitions by pane */}
            {sortedPaneEntries.map(([paneKey, acqs]) => {
              const pane = groupPane(acqs);
              const contribution = contributions?.find((c) => c.id === acqs[0]?.contribution_id);
              const ownerLabel = contribution
                ? `${contribution.username}${contribution.user_id === user?.id ? " (moi)" : ""}`
                : "Membre";
              const isExpanded = expandedPanes.has(paneKey);
              const paneProgress = getGroupProgress(acqs);
              const label = pane
                ? `Panneau ${pane.pane_number} — ${pane.ra} / ${pane.dec}`
                : "Acquisitions";

              return (
                <Card key={paneKey} className="border-border/50">
                  <CardHeader
                    className="cursor-pointer select-none pb-3"
                    onClick={() => togglePane(paneKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {isTeam && contribution && (
                          <MemberAvatar userId={contribution.user_id} avatars={avatars} fallback={contribution.username?.[0]?.toUpperCase()} />
                        )}
                        <CardTitle className="text-sm font-medium">
                          {isTeam && <span className="text-muted-foreground">{ownerLabel} · </span>}
                          {label}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {paneProgress}%
                        </Badge>
                      </div>
                      <div className="w-32">
                        <Progress value={paneProgress} className="h-1.5" />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {acqs.map((acq) => {
                          const acquiredPercent = acq.quantity > 0 ? Math.min(100, Math.round((acq.acquired / acq.quantity) * 100)) : 0;
                          const acquiredSurplus = Math.max(0, acq.acquired - acq.quantity);
                          return (
                            <div
                              key={acq.id}
                              className="flex flex-col gap-2 p-2 rounded-md bg-secondary/30"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-10 font-semibold text-sm text-center shrink-0"
                                  style={{ color: filterColors[acq.filter] || "hsl(var(--muted-foreground))" }}
                                >
                                  {acq.filter}
                                </span>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden relative">
                                      <div
                                        className="h-full rounded-full transition-all absolute left-0 top-0"
                                        style={{
                                          width: `${acquiredPercent}%`,
                                          backgroundColor: filterColors[acq.filter] || "hsl(var(--primary))",
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-12 text-right">
                                      {acquiredPercent}%
                                    </span>

                                    {acq.quantity - acq.acquired > 0 && (
                                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                                        Restante : {acq.quantity - acq.acquired} brutes
                                      </span>
                                    )}

                                    {acquiredSurplus > 0 && (
                                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] shrink-0">+{acquiredSurplus}</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {acq.exposure_duration}s · Bin {acq.bin}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pl-[3.25rem]">
                                {/* Acquired counter */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-16">Acquis</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={acq.acquired <= 0 || updateAcquired.isPending}
                                      onClick={() => updateAcquired.mutate({ id: acq.id, acquired: acq.acquired - 1 })}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        min={0}
                                        className="h-7 w-16 text-center text-sm tabular-nums"
                                        value={draftsAcquired[acq.id] ?? String(acq.acquired)}
                                        onChange={(e) => setDraftsAcquired((d) => ({ ...d, [acq.id]: e.target.value }))}
                                        onBlur={() => {
                                          const raw = draftsAcquired[acq.id];
                                          setDraftsAcquired((d) => { const n = { ...d }; delete n[acq.id]; return n; });
                                          if (raw === undefined) return;
                                          const v = parseInt(raw);
                                          const next = isNaN(v) ? 0 : Math.max(0, v);
                                          if (next !== acq.acquired) updateAcquired.mutate({ id: acq.id, acquired: next });
                                        }}
                                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                      />
                                      <span className="text-xs text-muted-foreground">/ {acq.quantity}</span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      disabled={updateAcquired.isPending}
                                      onClick={() => updateAcquired.mutate({ id: acq.id, acquired: acq.acquired + 1 })}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                              </div>



                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {acquisitions?.length === 0 && (
              <Card className="border-border/50 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <ImagePlus className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold mb-1">Aucune acquisition configurée</h3>
                  <p className="text-sm text-muted-foreground">
                    Éditez ce projet pour configurer les filtres et quantités cibles.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Frames;
