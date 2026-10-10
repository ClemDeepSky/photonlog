import { coordinatesToJ2000 } from "@/components/CoordinateInputs";
import ProjectCoordinates from "@/components/projects/ProjectCoordinates";
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
import { Upload, Trash2, Plus, ArrowLeft, Camera, FolderOpen } from "lucide-react";
import SkyViewer from "@/components/projects/SkyViewer";

import FilenamePreview from "@/components/projects/FilenamePreview";
import ProjectImageField from "@/components/projects/ProjectImageField";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { parseTelescopiusCsv } from "@/lib/telescopiusCsv";

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
  const [filenamePattern, setFilenamePattern] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [setup, setSetup] = useState("");
  const [isTeamProject, setIsTeamProject] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isMosaic, setIsMosaic] = useState(false);
  const [coordMode, setCoordMode] = useState<"manual" | "csv">("manual");

  const [ra, setRa] = useState("");
  const [dec, setDec] = useState("");
  const [positionAngle, setPositionAngle] = useState("");

  const [panes, setPanes] = useState<Pane[]>([]);
  const [paneEpoch, setPaneEpoch] = useState<"J2000" | "JNow">("J2000");
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

  const selectedSetup = equipment?.find((e) => e.name === setup);
  const setupSensorWidthMm = selectedSetup?.pixel_size && selectedSetup?.sensor_width_px
    ? (Number(selectedSetup.pixel_size) * selectedSetup.sensor_width_px) / 1000 : null;
  const setupSensorHeightMm = selectedSetup?.pixel_size && selectedSetup?.sensor_height_px
    ? (Number(selectedSetup.pixel_size) * selectedSetup.sensor_height_px) / 1000 : null;

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
    setFilenamePattern((project as any).filename_pattern || "");
    setDescription(project.description || "");
    setImageUrl((project as any).image_url || null);
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

  const parseCsv = (text: string): Pane[] => parseTelescopiusCsv(text) as Pane[];

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text).map((pane) => ({ ...pane, ...coordinatesToJ2000(pane.ra, pane.dec, paneEpoch) }));
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

  // Ouvre le sélecteur de dossier pour définir la racine du projet.
  // On ne fait que mémoriser le dossier : aucun fichier n'est lu ni importé.
  const pickRootFolder = async () => {
    try {
      const { requestProjectDirHandle } = await import("@/lib/dirHandleStore");
      const handle = await requestProjectDirHandle(id!, { mode: "read" });
      setFolderPath((prev) => (prev.trim() ? prev : handle.name));
      toast({ title: "Dossier racine enregistré", description: `« ${handle.name} » sera utilisé pour l'actualisation des acquisitions.` });
    } catch (e: any) {
      if (e?.name === "AbortError") return; // l'utilisateur a annulé
      // Sélecteur natif indisponible (cadre intégré, navigateur non compatible) :
      // on n'utilise PAS le champ de dossier classique (il déclenche une fenêtre
      // « Importer N fichiers » du navigateur). On propose d'ouvrir l'app dans un onglet.
      toast({
        title: "Sélecteur de dossier indisponible ici",
        description: "Ouvrez Photonlog dans un onglet complet (icône en haut à droite de l'aperçu) pour choisir le dossier, ou saisissez son chemin à la main.",
        variant: "destructive",
      });
    }
  };

  const updateProject = useMutation({
    mutationFn: async () => {
      // Update project
      const { error } = await supabase
        .from("projects")
        .update({
          name, description: description || null, setup: setup || null,
          image_url: imageUrl,
          folder_path: folderPath || null,
          filename_pattern: filenamePattern || null,
          team_id: isTeamProject ? selectedTeamId : null, is_mosaic: isMosaic,
          ra: isMosaic ? null : ra || null, dec: isMosaic ? null : dec || null,
          position_angle: isMosaic ? null : (parseFloat(positionAngle) || null),
        })
        .eq("id", id!);
      if (error) throw error;

      // Mise à jour en place : les identifiants des panneaux et des lignes de plan
      // sont conservés, pour que les brutes déjà indexées restent reliées à leur ligne.
      const targetPanes = isMosaic ? panes : [];

      const keptPaneIds = new Set(targetPanes.map((p) => p.id).filter(Boolean) as string[]);
      const removedPaneIds = (projectPanes ?? [])
        .map((p) => p.id as string)
        .filter((pid) => !keptPaneIds.has(pid));

      const paneIdByIndex = new Map<number, string>();
      for (let i = 0; i < targetPanes.length; i++) {
        const p = targetPanes[i];
        const row = {
          project_id: id!, pane_number: p.pane_number, ra: p.ra, dec: p.dec,
          position_angle: p.position_angle, pane_width: p.pane_width, pane_height: p.pane_height,
          overlap: p.overlap, row_index: p.row_index, col_index: p.col_index,
        };
        if (p.id) {
          const { error: paneUpdError } = await supabase.from("project_panes").update(row).eq("id", p.id);
          if (paneUpdError) throw paneUpdError;
          paneIdByIndex.set(i, p.id);
        } else {
          const { data: newPane, error: paneInsError } = await supabase
            .from("project_panes").insert(row).select("id").single();
          if (paneInsError) throw paneInsError;
          paneIdByIndex.set(i, newPane.id);
        }
      }

      const acqKey = (filter: string, exposure: number, bin: number, paneId: string | null) =>
        `${paneId ?? "-"}|${filter}|${exposure}|${bin}`;
      const plainKey = (filter: string, exposure: number, bin: number) => `${filter}|${exposure}|${bin}`;

      const prevAcqs = (projectAcquisitions ?? []) as any[];
      const prevByPaneKey = new Map<string, string>();
      const prevByPlainKey = new Map<string, string[]>();
      prevAcqs.forEach((a) => {
        prevByPaneKey.set(acqKey(a.filter, Number(a.exposure_duration), a.bin, a.pane_id ?? null), a.id);
        const pk = plainKey(a.filter, Number(a.exposure_duration), a.bin);
        prevByPlainKey.set(pk, [...(prevByPlainKey.get(pk) ?? []), a.id]);
      });

      type DesiredRow = {
        key: string; plain: string; filter: string; exposure: number; bin: number;
        quantity: number; pane_id: string | null;
      };
      const desired: DesiredRow[] = [];
      if (isMosaic && targetPanes.length > 0) {
        targetPanes.forEach((_, paneIdx) => {
          const paneId = paneIdByIndex.get(paneIdx) ?? null;
          acquisitions.forEach((acq, acqIdx) => {
            if (isPaneAcqEnabled(paneIdx, acqIdx)) {
              desired.push({
                key: acqKey(acq.filter, acq.exposure_duration, acq.bin, paneId),
                plain: plainKey(acq.filter, acq.exposure_duration, acq.bin),
                filter: acq.filter, exposure: acq.exposure_duration, bin: acq.bin,
                quantity: acq.quantity, pane_id: paneId,
              });
            }
          });
        });
      } else {
        acquisitions.forEach((acq) => {
          desired.push({
            key: acqKey(acq.filter, acq.exposure_duration, acq.bin, null),
            plain: plainKey(acq.filter, acq.exposure_duration, acq.bin),
            filter: acq.filter, exposure: acq.exposure_duration, bin: acq.bin,
            quantity: acq.quantity, pane_id: null,
          });
        });
      }

      const used = new Set<string>();
      const toInsert: any[] = [];
      const toUpdate: { id: string; quantity: number; pane_id: string | null }[] = [];
      desired.forEach((d) => {
        const match = isMosaic
          ? prevByPaneKey.get(d.key)
          : (prevByPlainKey.get(d.plain) ?? []).find((x) => !used.has(x));
        if (match && !used.has(match)) {
          used.add(match);
          toUpdate.push({ id: match, quantity: d.quantity, pane_id: d.pane_id });
        } else {
          toInsert.push({
            project_id: id!, pane_id: d.pane_id, filter: d.filter,
            exposure_duration: d.exposure, quantity: d.quantity, bin: d.bin,
          });
        }
      });

      const toDelete = prevAcqs.map((a) => a.id as string).filter((pid) => !used.has(pid));
      if (toDelete.length > 0) {
        const { error: acqDelError } = await supabase.from("project_acquisitions").delete().in("id", toDelete);
        if (acqDelError) throw acqDelError;
      }
      for (const u of toUpdate) {
        const { error: acqUpdError } = await supabase
          .from("project_acquisitions").update({ quantity: u.quantity, pane_id: u.pane_id }).eq("id", u.id);
        if (acqUpdError) throw acqUpdError;
      }
      if (toInsert.length > 0) {
        const { error: acqInsError } = await supabase.from("project_acquisitions").insert(toInsert);
        if (acqInsError) throw acqInsError;
      }

      if (removedPaneIds.length > 0) {
        const { error: paneDelError } = await supabase.from("project_panes").delete().in("id", removedPaneIds);
        if (paneDelError) throw paneDelError;
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
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
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: M42 - Nébuleuse d'Orion"  />
              </div>
              <div>
                <Label>Dossier racine du projet</Label>
                <div className="flex gap-2">
                  <Input value={folderPath} onChange={(e) => setFolderPath(e.target.value)} placeholder="Ex: M31 ou D:\Astro\M31" className="flex-1" />
                  <Button type="button" variant="outline" size="icon" onClick={pickRootFolder} title="Choisir le dossier racine">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cliquez sur l'icône pour désigner le dossier racine du projet : seul son emplacement est enregistré, aucun fichier n'est lu ni importé.</p>
              </div>
              <div>
                <Label>Structure des noms de fichiers (optionnel)</Label>
                <Input
                  value={filenamePattern}
                  onChange={(e) => setFilenamePattern(e.target.value)}
                  placeholder="$$TARGETNAME$$_$$IMAGETYPE$$_$$FILTER$$_$$DATE$$_$$TIME$$_$$SENSORTEMP$$_$$EXPOSURETIME$$s_FWHM$$FWHM$$_ex$$ECCENTRICITY$$_starsCount-$$STARCOUNT$$_hfr-$$HFR$$_$$FRAMENR$$"
                  
                />
                <FilenamePreview pattern={filenamePattern} />
                <p className="text-xs text-muted-foreground mt-1">
                  Collez le modèle de nommage de votre logiciel (N.I.N.A. par exemple) pour extraire automatiquement
                  la qualité de chaque brute (FWHM, excentricité, HFR, étoiles, température). Laissez vide si vos
                  fichiers ne contiennent pas ces informations.
                </p>
              </div>
              <div >
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
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre projet..." rows={2}  />
              </div>
              <ProjectImageField value={imageUrl} onChange={setImageUrl} ra={ra} dec={dec} />
            </CardContent>
          </Card>

          <ProjectCoordinates
            isMosaic={isMosaic}
            onMosaicChange={(v) => { setIsMosaic(v); if (!v) { setPanes([]); setDisabledAcquisitions({}); } }}
            mode={coordMode} onModeChange={setCoordMode}
            epoch={paneEpoch} onEpochChange={setPaneEpoch}
            ra={ra} dec={dec} angle={positionAngle}
            onRaChange={setRa} onDecChange={setDec} onAngleChange={setPositionAngle}
            panes={panes}
            onPaneCoordinatesChange={(index, r, d) => setPanes((prev) => prev.map((pane, i) => i === index ? { ...pane, ra: r, dec: d } : pane))}
            onPaneAngleChange={(index, value) => updatePane(index, "position_angle", value)}
            onAddPane={addManualPane} onRemovePane={removePane}
            csvUpload={<CsvUploadZone />}
            viewer={
                <SkyViewer
                  ra={ra}
                  dec={dec}
                  onRaDecChange={(r, d) => { setRa(r); setDec(d); }}
                  onRotationChange={(a) => setPositionAngle(String(a))}
                  positionAngle={parseFloat(positionAngle) || 0}
                  panes={isMosaic ? panes.map((p) => ({ ra: p.ra, dec: p.dec, position_angle: p.position_angle })) : undefined}
                  isMosaic={isMosaic}
                  setupFocalLength={selectedSetup?.focal_length ? Number(selectedSetup.focal_length) : null}
                  setupSensorWidthMm={setupSensorWidthMm}
                  setupSensorHeightMm={setupSensorHeightMm}
                  setupName={selectedSetup?.name}
                />
            }
          />

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
