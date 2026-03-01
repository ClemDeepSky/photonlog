import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, Plus, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface Pane {
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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: { id: string; name: string; logo_url: string | null }[] | undefined;
}

const CreateProjectDialog = ({ open, onOpenChange, teams }: CreateProjectDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setSetup("");
    setIsTeamProject(false);
    setSelectedTeamId("");
    setIsMosaic(false);
    setCoordMode("manual");
    setRa("");
    setDec("");
    setPositionAngle("");
    setPanes([]);
  };

  const parseCsv = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    const dataLines =
      lines.length > 1 && lines[0].toLowerCase().includes("pane") && lines[0].toLowerCase().includes("ra")
        ? lines.slice(1)
        : lines;

    const parsed: Pane[] = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 2) continue;

      const paneNum = parseInt(parts[0].replace(/[^\d]/g, "")) || parsed.length + 1;
      parsed.push({
        pane_number: paneNum,
        ra: parts[1] || "",
        dec: parts[2] || "",
        position_angle: parseFloat(parts[3]) || null,
        pane_width: parseFloat(parts[4]) || null,
        pane_height: parseFloat(parts[5]) || null,
        overlap: parseFloat(parts[6]?.replace("%", "")) || null,
        row_index: parseInt(parts[7]) || null,
        col_index: parseInt(parts[8]) || null,
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
        // Single image CSV: fill RA/DEC/angle fields
        setRa(parsed[0].ra);
        setDec(parsed[0].dec);
        setPositionAngle(parsed[0].position_angle?.toString() || "");
        toast({ title: "Coordonnées importées depuis le CSV" });
      } else {
        setPanes(parsed);
        setIsMosaic(true);
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
  };

  const canSubmit = name && (!isTeamProject || selectedTeamId);

  const createProject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name,
          description: description || null,
          setup: setup || null,
          target_object: null,
          team_id: isTeamProject ? selectedTeamId : null,
          created_by: user!.id,
          is_mosaic: isMosaic,
          ra: isMosaic ? null : ra || null,
          dec: isMosaic ? null : dec || null,
          position_angle: isMosaic ? null : (parseFloat(positionAngle) || null),
        })
        .select("id")
        .single();
      if (error) throw error;

      if (isMosaic && panes.length > 0) {
        const { error: panesError } = await supabase.from("project_panes").insert(
          panes.map((p) => ({
            project_id: data.id,
            pane_number: p.pane_number,
            ra: p.ra,
            dec: p.dec,
            position_angle: p.position_angle,
            pane_width: p.pane_width,
            pane_height: p.pane_height,
            overlap: p.overlap,
            row_index: p.row_index,
            col_index: p.col_index,
          }))
        );
        if (panesError) throw panesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      resetForm();
      toast({ title: "Projet créé avec succès" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>Créez un projet d'acquisition personnel ou de team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Personal / Team toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!isTeamProject ? "default" : "outline"}
              size="sm"
              onClick={() => { setIsTeamProject(false); setSelectedTeamId(""); }}
              className="flex-1"
            >
              <User className="h-4 w-4 mr-2" /> Personnel
            </Button>
            <Button
              type="button"
              variant={isTeamProject ? "default" : "outline"}
              size="sm"
              onClick={() => setIsTeamProject(true)}
              className="flex-1"
              disabled={!teams?.length}
            >
              <Users className="h-4 w-4 mr-2" /> Team
            </Button>
          </div>

          {/* Team selector */}
          {isTeamProject && (
            <div>
              <Label>Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une team" /></SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div>
            <Label>Nom du projet</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: M42 - Nébuleuse d'Orion" />
          </div>

          {/* Setup */}
          <div>
            <Label>Setup</Label>
            <Select value={setup} onValueChange={setSetup}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un setup" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="setup_1">Setup 1</SelectItem>
                <SelectItem value="setup_2">Setup 2</SelectItem>
                <SelectItem value="setup_3">Setup 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez votre projet..." rows={2} />
          </div>

          {/* Mosaic toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isMosaic} onCheckedChange={(v) => { setIsMosaic(v); if (!v) setPanes([]); }} id="mosaic" />
            <Label htmlFor="mosaic">Projet mosaïque (plusieurs panneaux)</Label>
          </div>

          {/* Coordinates section */}
          {!isMosaic ? (
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Coordonnées</Label>
              </div>
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
                  <p className="text-xs text-muted-foreground">
                    Importez un CSV Telescopius pour remplir automatiquement les coordonnées.
                  </p>
                  <CsvUploadZone />
                  {ra && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ Coordonnées chargées : RA {ra} / DEC {dec}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border p-4">
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
                  <p className="text-xs text-muted-foreground">
                    Importez un CSV Telescopius (Pane, RA, DEC, Position Angle, Width, Height, Overlap, Row, Column)
                  </p>
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
                          <TableCell>
                            <Input value={pane.ra} onChange={(e) => updatePane(idx, "ra", e.target.value)} className="h-7 text-xs" placeholder="RA" />
                          </TableCell>
                          <TableCell>
                            <Input value={pane.dec} onChange={(e) => updatePane(idx, "dec", e.target.value)} className="h-7 text-xs" placeholder="DEC" />
                          </TableCell>
                          <TableCell>
                            <Input value={pane.position_angle?.toString() || ""} onChange={(e) => updatePane(idx, "position_angle", e.target.value)} className="h-7 text-xs" placeholder="°" type="number" />
                          </TableCell>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => createProject.mutate()} disabled={!canSubmit || createProject.isPending}>
            {createProject.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
