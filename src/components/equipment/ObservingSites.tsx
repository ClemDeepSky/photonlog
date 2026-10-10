import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SearchableSelect from "@/components/SearchableSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const CODES = "FR BE CH LU MC CA US GB IE DE AT IT ES PT NL DK NO SE FI IS PL CZ SK HU SI HR RS RO BG GR CY MT TR MA DZ TN SN CI CM MG RE MU ZA NA EG IL JO AE SA IN JP CN KR TW TH VN AU NZ CL AR BR MX PE CO UY BO EC CR";
const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
export const COUNTRIES = CODES.split(" ")
  .map((c) => ({ code: c, name: regionNames.of(c) || c }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

type GeoResult = { id: number; name: string; admin1?: string; country?: string; latitude: number; longitude: number; elevation?: number; timezone?: string };

export const useObservingSites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["observing-sites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("observing_sites").select("*").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
  });
};

const empty = { name: "", country: "France", city: "", latitude: "", longitude: "", elevation: "", timezone: "" };

const ObservingSites = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: sites, isLoading } = useObservingSites();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const countryCode = useMemo(() => COUNTRIES.find((c) => c.name === form.country)?.code, [form.country]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", query.trim());
        url.searchParams.set("count", "8");
        url.searchParams.set("language", "fr");
        if (countryCode) url.searchParams.set("countryCode", countryCode);
        const res = await fetch(url, { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.results || []);
      } catch { /* abandon */ } finally { setSearching(false); }
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, countryCode, open]);

  const pick = (r: GeoResult) => {
    setForm((f) => ({
      ...f,
      city: r.name,
      country: r.country || f.country,
      latitude: r.latitude.toFixed(5),
      longitude: r.longitude.toFixed(5),
      elevation: r.elevation != null ? String(Math.round(r.elevation)) : f.elevation,
      timezone: r.timezone || f.timezone,
      name: f.name || r.name,
    }));
    setQuery(""); setResults([]);
  };

  const startNew = () => { setEditId(null); setForm(empty); setQuery(""); setOpen(true); };
  const startEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, country: s.country || "", city: s.city || "", latitude: String(s.latitude), longitude: String(s.longitude), elevation: s.elevation != null ? String(s.elevation) : "", timezone: s.timezone || "" });
    setQuery(""); setOpen(true);
  };

  const lat = parseFloat(form.latitude.replace(",", "."));
  const lon = parseFloat(form.longitude.replace(",", "."));
  const valid = form.name.trim() && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !isNaN(lat) && !isNaN(lon);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(), country: form.country || null, city: form.city || null,
        latitude: lat, longitude: lon,
        elevation: form.elevation ? parseFloat(form.elevation) : null,
        timezone: form.timezone || null,
      };
      const { error } = editId
        ? await supabase.from("observing_sites").update(payload).eq("id", editId)
        : await supabase.from("observing_sites").insert({ ...payload, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["observing-sites"] }); setOpen(false); toast({ title: "Site enregistré" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("observing_sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["observing-sites"] }),
  });

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Sites d'observation</h2>
          <p className="text-sm text-muted-foreground">Les coordonnées servent à calculer la nuit astronomique et la position de la lune pour chaque session.</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> Nouveau site</Button>
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : !sites?.length ? (
        <Card className="border-dashed border-border/50"><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun site d'observation. Ajoutez votre jardin, votre observatoire ou votre spot de nomade.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => (
            <Card key={s.id} className="border-border/50">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-2">
                <div>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ")}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(s)} aria-label="Modifier"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => confirm(`Supprimer le site « ${s.name} » ?`) && remove.mutate(s.id)} aria-label="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">GPS</span><span className="font-mono">{Number(s.latitude).toFixed(4)}°, {Number(s.longitude).toFixed(4)}°</span></div>
                {s.elevation != null && <div className="flex justify-between"><span className="text-muted-foreground">Altitude</span><span>{s.elevation} m</span></div>}
                {s.timezone && <div className="flex justify-between"><span className="text-muted-foreground">Fuseau</span><span>{s.timezone}</span></div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editId ? "Modifier le site" : "Nouveau site d'observation"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom du site</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Observatoire du jardin" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Pays</Label>
                <SearchableSelect id="site-country" options={COUNTRIES.map((c) => c.name)} value={form.country} onChange={(v: string) => setForm({ ...form, country: v })} placeholder="Choisir un pays" />
              </div>
              <div className="relative">
                <Label>Ville à proximité</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={form.city || "Rechercher une ville…"} />
                  {searching && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                </div>
                {results.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-auto">
                    {results.map((r) => (
                      <button key={r.id} type="button" onClick={() => pick(r)} className="block w-full px-3 py-2 text-left text-sm hover:bg-accent">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground"> — {[r.admin1, r.country].filter(Boolean).join(", ")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Latitude (°)</Label><Input value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="48.85661" /></div>
              <div><Label>Longitude (°)</Label><Input value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="2.35222" /></div>
              <div><Label>Altitude (m)</Label><Input value={form.elevation} onChange={(e) => setForm({ ...form, elevation: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Choisissez une ville pour pré-remplir les coordonnées, puis ajustez-les avec la position GPS exacte de votre site si besoin (nord et est positifs).</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ObservingSites;
