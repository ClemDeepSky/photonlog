import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Trash2, Plus, ArrowLeft, Camera, MapPin } from "lucide-react";
import SkyViewer from "@/components/projects/SkyViewer";
import FolderScanner from "@/components/frames/FolderScanner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Pane {
  id?: string;
  pane_number: number;
  ra: string;
  dec: string;
  position_angle: number | null;
  pane_width: number | null;
  pane_height: number | null;
  overlap: number | null;
  row_index: number | null;
  col_index: number | null;
}

interface Acquisition {
  id?: string;
  filter: string;
  exposure_duration: number;
  quantity: number;
  bin: number;
  pane_id?: string | null;
}

const FILTERS = ["L", "R", "G", "B", "Ha", "OIII", "SII", "UV", "IR"];

const EditProject = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [description, setDescription] = useState("");
  const [setup, setSetup] = useState("");
  const [isTeamProject, setIsTeamProject] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isMosaic, setIsMosaic] = useState(false);
  const [coordMode, setCoordMode] = useState<"manual" | "csv">("manual");

  const [ra, setRa] = useState("");
  const [dec, setDec] = useState("");
  const [positionAngle, setPositionAngle] = useState("");

  const [panes, setPanes] = useState<Pane[]>([]);
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [disabledAcquisitions, setDisabledAcquisitions] = useState<Record<number, Set<number>>>({});
  const [loaded, setLoaded] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ["my-teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id, name, logo_url");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load project data
  const { data: equipment } = useQuery({
    queryKey: ["equipment-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .select("id, name, focal_length, diameter, pixel_size, sensor_width_px, sensor_height_px, filters")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: projectPanes } = useQuery({
    queryKey: ["project-panes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_panes").select("*").eq("project_id", id!).order("pane_number");
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: projectAcquisitions } = useQuery({
    queryKey: ["project-acquisitions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_acquisitions").select("*").eq("project_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Populate form when data loads
  useEffect(() => {
    if (!project || loaded) return;

    setName(project.name);
    setFolderPath((project as any).folder_path || "");
    setDescription(project.description || "");
    setSetup(project.setup || "");
    setIsMosaic(project.is_mosaic);
    setRa(project.ra || "");
    setDec(project.dec || "");
    setPositionAngle(project.position_angle?.toString() || "");

    if (project.team_id) {
      setIsTeamProject(true);
      setSelectedTeamId(project.team_id);
    }
  }, [project, loaded]);

  useEffect(() => {
    if (!project || loaded) return;
    if (projectPanes !== undefined && projectAcquisitions !== undefined) {
      if (projectPanes && projectPanes.length > 0) {
        setPanes(projectPanes.map((p) => ({
          id: p.id, pane_number: p.pane_number, ra: p.ra, dec: p.dec,
          position_angle: p.position_angle ? Number(p.position_angle) : null,
          pane_width: p.pane_width ? Number(p.pane_width) : null,
          pane_height: p.pane_height ? Number(p.pane_height) : null,
          overlap: p.overlap ? Number(p.overlap) : null,
          row_index: p.row_index, col_index: p.col_index,
        })));
      }

      if (projectAcquisitions && projectAcquisitions.length > 0) {
        if (project.is_mosaic && projectPanes && projectPanes.length > 0) {
          // Extract unique acquisitions (by filter+exposure+bin) and build disabled map
          const uniqueAcqs: Acquisition[] = [];
          const acqKey = (a: { filter: string; exposure_duration: number; bin: number }) =>
            `${a.filter}-${a.exposure_duration}-${a.bin}`;

          const allKeys = new Set<string>();
          projectAcquisitions.forEach((a) => {
            const key = acqKey(a);
            if (!allKeys.has(key)) {
              allKeys.add(key);
              uniqueAcqs.push({
                filter: a.filter, exposure_duration: Number(a.exposure_duration),
                quantity: a.quantity, bin: a.bin,
              });
            }
          });
          setAcquisitions(uniqueAcqs);

          // Build disabled map: for each pane, check which acquisitions are missing
          const disabled: Record<number, Set<number>> = {};
          const existingPaneAcqs = new Set(
            projectAcquisitions.map((a) => `${a.pane_id}-${acqKey(a)}`)
          );
          projectPanes.forEach((pane, paneIdx) => {
            uniqueAcqs.forEach((acq, acqIdx) => {
              const key = `${pane.id}-${acqKey(acq)}`;
              if (!existingPaneAcqs.has(key)) {
                if (!disabled[paneIdx]) disabled[paneIdx] = new Set();
                disabled[paneIdx].add(acqIdx);
              }
            });
          });
          setDisabledAcquisitions(disabled);
        } else {
          setAcquisitions(projectAcquisitions.map((a) => ({
            id: a.id, filter: a.filter, exposure_duration: Number(a.exposure_duration),
            quantity: a.quantity, bin: a.bin,
          })));
        }
      } else {
        setAcquisitions([{ filter: "L", exposure_duration: 300, quantity: 10, bin: 1 }]);
      }

      setLoaded(true);
    }
  }, [project, projectPanes, projectAcquisitions, loaded]);

  const parseCsv = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const dataLines = lines.length > 1 && lines[0].toLowerCase().includes("pane") && lines[0].toLowerCase().includes("ra") ? lines.slice(1) : lines;
    const parsed: Pane[] = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 2) continue;
      const paneNum = parseInt(parts[0].replace(/[^\d]/g, "")) || parsed.length + 1;
      parsed.push({
        pane_number: paneNum, ra: parts[1] || "", dec: parts[2] || "",
        position_angle: parseFloat(parts[3]) || null, pane_width: parseFloat(parts[4]) || null,
        pane_height: parseFloat(parts[5]) || null, overlap: parseFloat(parts[6]?.replace("%", "")) || null,
        row_index: parseInt(parts[7]) || null, col_index: parseInt(parts[8]) || null,
      });
    }
    return parsed;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast({ title: "Erreur", description: "Aucune donnée valide trouvée dans le CSV", variant: "destructive" });
        return;
      }
      if (parsed.length === 1 && !isMosaic) {
        setRa(parsed[0].ra); setDec(parsed[0].dec);
        setPositionAngle(parsed[0].position_angle?.toString() || "");
        toast({ title: "Coordonnées importées depuis le CSV" });
      } else {
        setPanes(parsed); setIsMosaic(true); setDisabledAcquisitions({});
        toast({ title: `${parsed.length} panneau(x) importé(s)` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const addManualPane = () => {
    setPanes((prev) => [
      ...prev,
      { pane_number: prev.length + 1, ra: "", dec: "", position_angle: null, pane_width: null, pane_height: null, overlap: null, row_index: null, col_index: null },
    ]);
  };

  const updatePane = (index: number, field: keyof Pane, value: string) => {
    setPanes((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, [field]: ["ra", "dec"].includes(field) ? value : (parseFloat(value) || null) } : p
      )
    );
  };

  const removePane = (index: number) => {
    setPanes((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, pane_number: i + 1 })));
    setDisabledAcquisitions((prev) => {
      const next: Record<number, Set<number>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  };

  const addAcquisition = () => {
    setAcquisitions((prev) => [...prev, { filter: "L", exposure_duration: 300, quantity: 10, bin: 1 }]);
  };

  const updateAcquisition = (idx: number, field: keyof Acquisition, value: string) => {
    setAcquisitions((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: field === "filter" ? value : (parseFloat(value) || 0) } : a))
    );
  };

  const removeAcquisition = (idx: number) => {
    setAcquisitions((prev) => prev.filter((_, i) => i !== idx));
    setDisabledAcquisitions((prev) => {
      const next: Record<number, Set<number>> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const newSet = new Set<number>();
        v.forEach((ai) => {
          if (ai < idx) newSet.add(ai);
          else if (ai > idx) newSet.add(ai - 1);
        });
        if (newSet.size > 0) next[parseInt(k)] = newSet;
      });
      return next;
    });
  };

  const togglePaneAcquisition = (paneIndex: number, acqIndex: number) => {
    setDisabledAcquisitions((prev) => {
      const next = { ...prev };
      const set = new Set(next[paneIndex] || []);
      if (set.has(acqIndex)) set.delete(acqIndex);
      else set.add(acqIndex);
      if (set.size === 0) delete next[paneIndex];
      else next[paneIndex] = set;
      return next;
    });
  };

  const isPaneAcqEnabled = (paneIndex: number, acqIndex: number) => {
    return !(disabledAcquisitions[paneIndex]?.has(acqIndex));
  };

  const canSubmit = name && (!isTeamProject || selectedTeamId);

  const updateProject = useMutation({
    mutationFn: async () => {
      // Update project
      const { error } = await supabase
        .from("projects")
        .update({
          name, description: description || null, setup: setup || null,
          folder_path: folderPath || null,
          team_id: isTeamProject ? selectedTeamId : null, is_mosaic: isMosaic,
          ra: isMosaic ? null : ra || null, dec: isMosaic ? null : dec || null,
          position_angle: isMosaic ? null : (parseFloat(positionAngle) || null),
        })
        .eq("id", id!);
      if (error) throw error;

      // Delete old panes and acquisitions, then re-insert
      await supabase.from("project_acquisitions").delete().eq("project_id", id!);
      await supabase.from("project_panes").delete().eq("project_id", id!);

      if (isMosaic && panes.length > 0) {
        const { data: panesData, error: panesError } = await supabase.from("project_panes").insert(
          panes.map((p) => ({
            project_id: id!, pane_number: p.pane_number, ra: p.ra, dec: p.dec,
            position_angle: p.position_angle, pane_width: p.pane_width, pane_height: p.pane_height,
            overlap: p.overlap, row_index: p.row_index, col_index: p.col_index,
          }))
        ).select("id");
        if (panesError) throw panesError;

        const acqInserts: any[] = [];
        panes.forEach((_, paneIdx) => {
          const paneId = panesData?.[paneIdx]?.id;
          acquisitions.forEach((acq, acqIdx) => {
            if (isPaneAcqEnabled(paneIdx, acqIdx)) {
              acqInserts.push({
                project_id: id!, pane_id: paneId || null,
                filter: acq.filter, exposure_duration: acq.exposure_duration,
                quantity: acq.quantity, bin: acq.bin,
              });
            }
          });
        });
        if (acqInserts.length > 0) {
          const { error: acqError } = await supabase.from("project_acquisitions").insert(acqInserts);
          if (acqError) throw acqError;
        }
      } else {
        if (acquisitions.length > 0) {
          const { error: acqError } = await supabase.from("project_acquisitions").insert(
            acquisitions.map((acq) => ({
              project_id: id!, pane_id: null,
              filter: acq.filter, exposure_duration: acq.exposure_duration,
              quantity: acq.quantity, bin: acq.bin,
            }))
          );
          if (acqError) throw acqError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-edit", id] });
      toast({ title: "Projet mis à jour" });
      navigate("/projects");
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const CsvUploadZone = () => (
    <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-md p-3 hover:bg-muted/50 transition-colors justify-center">
      <Upload className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Importer un CSV Telescopius</span>
      <input type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvUpload} />
    </label>
  );

  if (isLoading || !loaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground animate-pulse">Chargement du projet...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Modifier le projet</h1>
            <p className="text-muted-foreground text-sm">Modifiez les paramètres de votre projet.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* General info */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={isTeamProject} onCheckedChange={(v) => { setIsTeamProject(v); if (!v) setSelectedTeamId(""); }} id="team-toggle" disabled={!teams?.length} />
                <Label htmlFor="team-toggle">Projet de team</Label>
              </div>

              {isTeamProject && (
                <div>
                  <Label>Team</Label>
                  <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une team" /></SelectTrigger>
                    <SelectContent>
                      {teams?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Nom du projet</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: M42 - Nébuleuse d'Orion" />
              </div>
              <div>
                <Label>Dossier local</Label>
                <div className="flex items-center gap-2">
                  <Input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="Ex: D:\Astro\M42 ou /home/user/astro/M42" className="flex-1" />
                  <FolderScanner
                    acquisitions={(projectAcquisitions || []).map(a => ({ id: a.id, filter: a.filter, quantity: a.quantity, acquired: a.acquired }))}
                    onApplyResults={(updates) => {
                      const doUpdate = async () => {
                        for (const u of updates) {
                          const { error } = await supabase
                            .from("project_acquisitions")
                            .update({ acquired: Math.max(0, u.acquired) })
                            .eq("id", u.id);
                          if (error) throw error;
                        }
                        queryClient.invalidateQueries({ queryKey: ["project-acquisitions", id] });
                        queryClient.invalidateQueries({ queryKey: ["frames-acquisitions", id] });
                        queryClient.invalidateQueries({ queryKey: ["dashboard-projects"] });
                        toast({ title: "Acquisitions mises à jour depuis le scan" });
                      };
                      doUpdate().catch((e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }));
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Chemin de référence. Utilisez le bouton pour scanner et compter les fichiers par filtre.</p>
              </div>
              <div>
                <Label>Setup</Label>
                <Select value={setup} onValueChange={setSetup}>
                  <SelectTrigger><SelectValue placeholder={equipment?.length ? "Sélectionner un setup" : "Aucun setup — créez-en un dans Matériel"} /></SelectTrigger>
                  <SelectContent>
                    {equipment?.map((e) => (
                      <SelectItem key={e.id} value={e.name}>
                        {e.name}{e.focal_length ? ` — ${e.focal_length}mm` : ""}
                      </SelectItem>
                    ))}
                    {setup && !equipment?.some((e) => e.name === setup) && (
                      <SelectItem value={setup}>{setup}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedSetup && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSetup.diameter ? `Ø${selectedSetup.diameter}mm · ` : ""}
                    {selectedSetup.focal_length ? `${selectedSetup.focal_length}mm · ` : ""}
                    {setupSensorWidthMm ? `capteur ${setupSensorWidthMm.toFixed(1)}×${setupSensorHeightMm!.toFixed(1)}mm` : ""}
                  </p>
                )}
              </div>
              <div>
                <Label>Description (optionnel)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre projet..." rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Coordinates / Mosaic */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Switch checked={isMosaic} onCheckedChange={(v) => {
                  setIsMosaic(v);
                  if (!v) { setPanes([]); setDisabledAcquisitions({}); }
                }} id="mosaic" />
                <Label htmlFor="mosaic">Projet mosaïque (plusieurs panneaux)</Label>
              </div>

              {!isMosaic ? (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Coordonnées</Label>
                  <Tabs value={coordMode} onValueChange={(v) => setCoordMode(v as "manual" | "csv")}>
                    <TabsList className="h-8 mb-3">
                      <TabsTrigger value="manual" className="text-xs px-3 h-6">Saisie manuelle</TabsTrigger>
                      <TabsTrigger value="csv" className="text-xs px-3 h-6">Import CSV</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {coordMode === "manual" ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">RA</Label>
                        <Input value={ra} onChange={(e) => setRa(e.target.value)} placeholder="00h 42' 44&quot;" />
                      </div>
                      <div>
                        <Label className="text-xs">DEC</Label>
                        <Input value={dec} onChange={(e) => setDec(e.target.value)} placeholder="41° 16' 09&quot;" />
                      </div>
                      <div>
                        <Label className="text-xs">Angle de position</Label>
                        <Input value={positionAngle} onChange={(e) => setPositionAngle(e.target.value)} placeholder="0" type="number" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Importez un CSV Telescopius pour remplir automatiquement les coordonnées.</p>
                      <CsvUploadZone />
                      {ra && <p className="text-xs text-muted-foreground mt-2">✓ Coordonnées chargées : RA {ra} / DEC {dec}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Panneaux mosaïque</Label>
                    <Tabs value={coordMode} onValueChange={(v) => setCoordMode(v as "manual" | "csv")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="manual" className="text-xs px-3 h-6">Manuel</TabsTrigger>
                        <TabsTrigger value="csv" className="text-xs px-3 h-6">CSV</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {coordMode === "csv" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Importez un CSV Telescopius (Pane, RA, DEC, Position Angle, Width, Height, Overlap, Row, Column)</p>
                      <CsvUploadZone />
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={addManualPane}>
                      <Plus className="h-3 w-3 mr-1" /> Ajouter un panneau
                    </Button>
                  )}
                  {panes.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>RA</TableHead>
                            <TableHead>DEC</TableHead>
                            <TableHead>Angle</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {panes.map((pane, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-mono">{pane.pane_number}</TableCell>
                              <TableCell><Input value={pane.ra} onChange={(e) => updatePane(idx, "ra", e.target.value)} className="h-7 text-xs" placeholder="RA" /></TableCell>
                              <TableCell><Input value={pane.dec} onChange={(e) => updatePane(idx, "dec", e.target.value)} className="h-7 text-xs" placeholder="DEC" /></TableCell>
                              <TableCell><Input value={pane.position_angle?.toString() || ""} onChange={(e) => updatePane(idx, "position_angle", e.target.value)} className="h-7 text-xs" placeholder="°" type="number" /></TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removePane(idx)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sky viewer */}
          {(ra || dec || (isMosaic && panes.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Cadrage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SkyViewer
                  ra={ra}
                  dec={dec}
                  positionAngle={parseFloat(positionAngle) || 0}
                  panes={isMosaic ? panes.map((p) => ({ ra: p.ra, dec: p.dec, position_angle: p.position_angle })) : undefined}
                  isMosaic={isMosaic}
                  setupFocalLength={selectedSetup?.focal_length ? Number(selectedSetup.focal_length) : null}
                  setupSensorWidthMm={setupSensorWidthMm}
                  setupSensorHeightMm={setupSensorHeightMm}
                  setupName={selectedSetup?.name}
                />
              </CardContent>
            </Card>
          )}

          {/* Acquisitions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5" /> Acquisitions
              </CardTitle>
              {isMosaic && panes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Les filtres s'appliquent à tous les panneaux par défaut. Vous pouvez les désactiver individuellement par panneau ci-dessous.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filtre</TableHead>
                    <TableHead>Exposition (s)</TableHead>
                    <TableHead>Quantité min.</TableHead>
                    <TableHead>Bin</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acquisitions.map((acq, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={acq.filter} onValueChange={(v) => updateAcquisition(idx, "filter", v)}>
                          <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FILTERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={acq.exposure_duration} onChange={(e) => updateAcquisition(idx, "exposure_duration", e.target.value)} className="h-8 w-24" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={acq.quantity} onChange={(e) => updateAcquisition(idx, "quantity", e.target.value)} className="h-8 w-20" />
                      </TableCell>
                      <TableCell>
                        <Select value={acq.bin.toString()} onValueChange={(v) => updateAcquisition(idx, "bin", v)}>
                          <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((b) => <SelectItem key={b} value={b.toString()}>{b}x{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {acquisitions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAcquisition(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" size="sm" onClick={addAcquisition}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter un filtre
              </Button>

              {/* Per-pane overrides for mosaic */}
              {isMosaic && panes.length > 0 && acquisitions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="text-sm font-semibold">Filtres par panneau</Label>
                  <p className="text-xs text-muted-foreground">Décochez un filtre pour le désactiver sur un panneau spécifique.</p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Panneau</TableHead>
                          {acquisitions.map((acq, idx) => (
                            <TableHead key={idx} className="text-center min-w-[60px]">
                              {acq.filter}
                              <span className="block text-[10px] font-normal text-muted-foreground">{acq.exposure_duration}s</span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {panes.map((pane, paneIdx) => (
                          <TableRow key={paneIdx}>
                            <TableCell className="text-xs font-mono">Pane {pane.pane_number}</TableCell>
                            {acquisitions.map((_, acqIdx) => (
                              <TableCell key={acqIdx} className="text-center">
                                <Checkbox
                                  checked={isPaneAcqEnabled(paneIdx, acqIdx)}
                                  onCheckedChange={() => togglePaneAcquisition(paneIdx, acqIdx)}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/projects")}>Annuler</Button>
            <Button onClick={() => updateProject.mutate()} disabled={!canSubmit || updateProject.isPending}>
              {updateProject.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default EditProject;
