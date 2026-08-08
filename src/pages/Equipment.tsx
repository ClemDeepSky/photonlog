import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wrench, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMERA_CATALOG, findCamera } from "@/data/cameras";
import { MOUNT_CATALOG, GUIDE_CAMERA_CATALOG, FILTER_CATALOG, ROTATOR_CATALOG, filterColor } from "@/data/gear";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type EquipmentProfile = {
  id: string;
  name: string;
  diameter: number | null;
  focal_length: number | null;
  imager_name: string | null;
  pixel_size: number | null;
  sensor_width_px: number | null;
  sensor_height_px: number | null;
  mount: string | null;
  guide_camera: string | null;
  rotator: string | null;
  filters: string[];
};

const emptyForm = {
  name: "",
  diameter: "",
  focal_length: "",
  imager_name: "",
  pixel_size: "",
  sensor_width_px: "",
  sensor_height_px: "",
  mount: "",
  guide_camera: "",
  rotator: "",
  filters: "",
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));
const int = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));
const OTHER = "__other__";

type PickerProps = {
  id: string;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

const CatalogPicker = ({ id, label, options, value, onChange, placeholder }: PickerProps) => {
  const isKnown = value !== "" && options.includes(value);
  const [custom, setCustom] = useState(!isKnown && value !== "");
  const selectValue = custom ? OTHER : isKnown ? value : "";
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTHER) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder ?? "Choisir…"} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Autre…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          maxLength={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Saisir le modèle"
        />
      )}
    </div>
  );
};

const Equipment = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<EquipmentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [cameraChoice, setCameraChoice] = useState<string>(OTHER);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("equipment_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as EquipmentProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setCameraChoice(OTHER);
    setOpen(true);
  };

  const openEdit = (item: EquipmentProfile) => {
    setEditingId(item.id);
    setCameraChoice(findCamera(item.imager_name) ? (item.imager_name as string) : OTHER);
    setForm({
      name: item.name ?? "",
      diameter: item.diameter?.toString() ?? "",
      focal_length: item.focal_length?.toString() ?? "",
      imager_name: item.imager_name ?? "",
      pixel_size: item.pixel_size?.toString() ?? "",
      sensor_width_px: item.sensor_width_px?.toString() ?? "",
      sensor_height_px: item.sensor_height_px?.toString() ?? "",
      mount: item.mount ?? "",
      guide_camera: item.guide_camera ?? "",
      rotator: item.rotator ?? "",
      filters: (item.filters ?? []).join(", "),
    });
    setOpen(true);
  };

  const selectedFilters = form.filters
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const toggleFilter = (f: string) => {
    const next = selectedFilters.includes(f)
      ? selectedFilters.filter((x) => x !== f)
      : [...selectedFilters, f];
    setForm((prev) => ({ ...prev, filters: next.join(", ") }));
  };

  const handleCameraChange = (value: string) => {
    setCameraChoice(value);
    if (value === OTHER) {
      setForm((f) => ({ ...f, imager_name: "", pixel_size: "", sensor_width_px: "", sensor_height_px: "" }));
      return;
    }
    const cam = findCamera(value);
    if (!cam) return;
    setForm((f) => ({
      ...f,
      imager_name: cam.name,
      pixel_size: String(cam.pixelSize),
      sensor_width_px: String(cam.widthPx),
      sensor_height_px: String(cam.heightPx),
    }));
  };

  const handleSave = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour gérer votre matériel.", variant: "destructive" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Nom requis", description: "Indiquez le nom du setup.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim().slice(0, 100),
      diameter: num(form.diameter),
      focal_length: num(form.focal_length),
      imager_name: form.imager_name.trim().slice(0, 100) || null,
      pixel_size: num(form.pixel_size),
      sensor_width_px: int(form.sensor_width_px),
      sensor_height_px: int(form.sensor_height_px),
      mount: form.mount.trim().slice(0, 100) || null,
      guide_camera: form.guide_camera.trim().slice(0, 100) || null,
      rotator: form.rotator.trim().slice(0, 100) || null,
      filters: form.filters
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
        .slice(0, 20),
    };

    const { error } = editingId
      ? await supabase.from("equipment_profiles").update(payload).eq("id", editingId)
      : await supabase.from("equipment_profiles").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Setup mis à jour" : "Setup créé" });
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("equipment_profiles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Setup supprimé" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const ratio = (item: EquipmentProfile) =>
    item.focal_length && item.diameter ? `f/${(item.focal_length / item.diameter).toFixed(1)}` : null;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }}>
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Matériel</h1>
            <p className="text-muted-foreground mt-1">Gérez vos profils de matériel d'astrophotographie</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau setup
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
              <h2 className="text-xl font-semibold mb-2">Aucun setup</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                Créez votre premier profil : télescope, imageur, monture, guidage et filtres.
              </p>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un setup
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id} className="border-border/50">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {[
                        item.diameter ? `Ø ${item.diameter} mm` : null,
                        item.focal_length ? `${item.focal_length} mm` : null,
                        ratio(item),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Imageur</span>
                    <span className="text-right">
                      {item.imager_name || "—"}
                      {item.sensor_width_px && item.sensor_height_px
                        ? ` (${item.sensor_width_px}×${item.sensor_height_px} px)`
                        : ""}
                      {item.pixel_size ? ` · ${item.pixel_size} µm` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Monture</span>
                    <span className="text-right">{item.mount || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Caméra de guidage</span>
                    <span className="text-right">{item.guide_camera || "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Rotateur</span>
                    <span className="text-right">{item.rotator || "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(item.filters ?? []).length > 0 ? (
                      item.filters.map((f) => (
                        <Badge key={f} variant="secondary" className="gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: filterColor(f) }}
                            aria-hidden
                          />
                          {f}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Aucun filtre</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le setup" : "Nouveau setup"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eq-name">Nom du setup *</Label>
                <Input id="eq-name" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Newton 200/800 + ASI2600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eq-diam">Diamètre (mm)</Label>
                  <Input id="eq-diam" type="number" value={form.diameter} onChange={(e) => setForm({ ...form, diameter: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eq-focal">Focale (mm)</Label>
                  <Input id="eq-focal" type="number" value={form.focal_length} onChange={(e) => setForm({ ...form, focal_length: e.target.value })} />
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-4 space-y-4">
                <p className="text-sm font-medium">Imageur</p>
                <div className="space-y-2">
                  <Label htmlFor="eq-imager">Modèle</Label>
                  <Select value={cameraChoice} onValueChange={handleCameraChange}>
                    <SelectTrigger id="eq-imager">
                      <SelectValue placeholder="Choisir une caméra" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {CAMERA_CATALOG.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} — {c.pixelSize} µm · {c.widthPx}×{c.heightPx}
                        </SelectItem>
                      ))}
                      <SelectItem value={OTHER}>Autre…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cameraChoice === OTHER && (
                <div className="space-y-2">
                  <Label htmlFor="eq-imager-custom">Nom de l'imageur</Label>
                  <Input id="eq-imager-custom" maxLength={100} value={form.imager_name} onChange={(e) => setForm({ ...form, imager_name: e.target.value })} placeholder="ASI2600MM Pro" />
                </div>
                )}
                {cameraChoice === OTHER ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="eq-px">Pixels (µm)</Label>
                    <Input id="eq-px" type="number" step="0.01" value={form.pixel_size} onChange={(e) => setForm({ ...form, pixel_size: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eq-w">Largeur (px)</Label>
                    <Input id="eq-w" type="number" value={form.sensor_width_px} onChange={(e) => setForm({ ...form, sensor_width_px: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eq-h">Hauteur (px)</Label>
                    <Input id="eq-h" type="number" value={form.sensor_height_px} onChange={(e) => setForm({ ...form, sensor_height_px: e.target.value })} />
                  </div>
                </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {form.pixel_size} µm · {form.sensor_width_px}×{form.sensor_height_px} px
                  </p>
                )}
              </div>

              <CatalogPicker
                key={`mount-${editingId ?? "new"}`}
                id="eq-mount"
                label="Monture"
                options={MOUNT_CATALOG}
                value={form.mount}
                onChange={(v) => setForm((f) => ({ ...f, mount: v }))}
                placeholder="Choisir une monture"
              />
              <CatalogPicker
                key={`guide-${editingId ?? "new"}`}
                id="eq-guide"
                label="Caméra de guidage"
                options={GUIDE_CAMERA_CATALOG}
                value={form.guide_camera}
                onChange={(v) => setForm((f) => ({ ...f, guide_camera: v }))}
                placeholder="Choisir une caméra de guidage"
              />
              <CatalogPicker
                key={`rot-${editingId ?? "new"}`}
                id="eq-rotator"
                label="Rotateur"
                options={ROTATOR_CATALOG}
                value={form.rotator}
                onChange={(v) => setForm((f) => ({ ...f, rotator: v }))}
                placeholder="Choisir un rotateur"
              />
              <div className="space-y-2">
                <Label>Filtres</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border/50 p-3 max-h-56 overflow-y-auto">
                  {FILTER_CATALOG.map((f) => {
                    const active = selectedFilters.includes(f);
                    const color = filterColor(f);
                    const cbId = `filter-${f.replace(/[^a-zA-Z0-9]/g, "-")}`;
                    return (
                      <div key={f} className="flex items-center gap-2">
                        <Checkbox id={cbId} checked={active} onCheckedChange={() => toggleFilter(f)} />
                        <label
                          htmlFor={cbId}
                          className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                          style={{ color: active ? color : undefined }}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-border/60 shrink-0"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                          <span className={active ? "font-medium" : "text-muted-foreground"}>{f}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                <Input
                  id="eq-filters"
                  maxLength={200}
                  value={form.filters}
                  onChange={(e) => setForm({ ...form, filters: e.target.value })}
                  placeholder="Autres filtres, séparés par des virgules"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default Equipment;
