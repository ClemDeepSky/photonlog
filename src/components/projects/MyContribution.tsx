// Projets Team : chaque membre règle sa contribution (setup, cadrage, objectifs, dossier) dans la page Projet.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ensureContribution } from "@/lib/sessions";
import { filterBand } from "@/lib/filterBands";
import { canEditContribution, useProjectContributions, type TeamContribution } from "@/lib/teamContributions";
import { coordinatesToJ2000, type Epoch } from "@/components/CoordinateInputs";
import { parseTelescopiusCsv } from "@/lib/telescopiusCsv";
import ProjectCoordinates from "./ProjectCoordinates";
import SkyViewer from "./SkyViewer";
import { ContributionCard, type PlanLine } from "./TeamContributions";

export interface ContribPane { id?: string; pane_number: number; ra: string; dec: string; position_angle: number | null; contribution_id?: string | null }

/** Panneaux personnels de tous les membres d'un projet. */
export const useContributionPanes = (projectId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ["contribution-panes", projectId],
    enabled: !!projectId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("project_panes")
        .select("id, pane_number, ra, dec, position_angle, contribution_id")
        .eq("project_id", projectId!).not("contribution_id", "is", null).order("pane_number");
      if (error) throw error;
      return (data || []).map((p) => ({ ...p, position_angle: p.position_angle != null ? Number(p.position_angle) : null })) as ContribPane[];
    },
  });

interface Props {
  projectId: string;
  team: { owner_id: string; management_mode: string } | null | undefined;
  defaultRa: string;
  defaultDec: string;
  defaultAngle: number | null;
}

const fmtH = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);

const MyContribution = ({ projectId, team, defaultRa, defaultDec, defaultAngle }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: contributions = [] } = useProjectContributions(projectId);
  const { data: allPanes = [] } = useContributionPanes(projectId);
  const mine = contributions.find((c) => c.user_id === user?.id);

  const { data: lines = [] } = useQuery({
    queryKey: ["contribution-lines", projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("project_acquisitions")
        .select("id, filter, exposure_duration, quantity, acquired, bin, pane_id, contribution_id").eq("project_id", projectId);
      if (error) throw error;
      return data as PlanLine[];
    },
  });

  const { data: setups = [] } = useQuery({
    queryKey: ["my-equipment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment_profiles")
        .select("id, name, focal_length, pixel_size, sensor_width_px, sensor_height_px").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data;
    },
  });

  // Cadrage personnel en cours d'édition (coordonnées J2000).
  const [panes, setPanes] = useState<ContribPane[]>([]);
  const [isMosaic, setIsMosaic] = useState(false);
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [epoch, setEpoch] = useState<Epoch>("J2000");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const myPanes = useMemo(() => allPanes.filter((p) => p.contribution_id === mine?.id), [allPanes, mine?.id]);
  useEffect(() => {
    if (!mine || loadedFor === mine.id) return;
    setPanes(myPanes.length ? myPanes : [{ pane_number: 1, ra: defaultRa, dec: defaultDec, position_angle: defaultAngle }]);
    setIsMosaic(myPanes.length > 1);
    setLoadedFor(mine.id);
  }, [mine, myPanes, loadedFor, defaultRa, defaultDec, defaultAngle]);

  const refresh = () => {
    ["team-contributions", "contribution-panes", "contribution-lines", "frames-acquisitions", "frames-panes"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k, projectId] }));
  };
  const run = async (fn: () => PromiseLike<{ error: any }>) => {
    const { error } = await fn();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    refresh();
  };

  const join = async () => {
    try { await ensureContribution(projectId, user!.id, { tracking_mode: "automatic" }); refresh(); }
    catch (e: any) { toast({ title: "Erreur", description: e.message, variant: "destructive" }); }
  };

  const chooseSetup = (c: TeamContribution, setupId: string) => {
    const s = setups.find((x) => x.id === setupId);
    if (!s) return;
    const mm = (px: number | null) => (s.pixel_size && px ? (Number(s.pixel_size) * px) / 1000 : null);
    run(() => supabase.from("project_contributions").update({
      equipment_profile_id: s.id, setup: s.name, focal_length: s.focal_length,
      sensor_width_mm: mm(s.sensor_width_px), sensor_height_mm: mm(s.sensor_height_px),
    }).eq("id", c.id));
  };

  const saveFraming = async () => {
    if (!mine) return;
    setSaving(true);
    try {
      const keep = (isMosaic ? panes : panes.slice(0, 1)).map((p, i) => ({ ...p, pane_number: i + 1 }));
      const keptIds = new Set(keep.filter((p) => p.id).map((p) => p.id));
      const removed = myPanes.filter((p) => !keptIds.has(p.id)).map((p) => p.id!);
      if (removed.length) {
        const { error: e1 } = await supabase.from("project_acquisitions").update({ pane_id: null }).in("pane_id", removed);
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("project_panes").delete().in("id", removed);
        if (e2) throw e2;
      }
      for (const p of keep) {
        const row = { project_id: projectId, contribution_id: mine.id, pane_number: p.pane_number, ra: p.ra, dec: p.dec, position_angle: p.position_angle };
        const { error } = p.id
          ? await supabase.from("project_panes").update(row).eq("id", p.id)
          : await supabase.from("project_panes").insert(row);
        if (error) throw error;
      }
      setLoadedFor(null);
      refresh();
      toast({ title: "Cadrage enregistré" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const others = contributions.filter((c) => c.id !== mine?.id);
  const commonLines = lines.filter((l) => !l.contribution_id);
  // Objectif global (plan commun) face à la somme des objectifs des membres, par filtre.
  const byFilter = new Map<string, { global: number; members: number }>();
  for (const l of lines) {
    const e = byFilter.get(l.filter) || { global: 0, members: 0 };
    const sec = l.quantity * Number(l.exposure_duration);
    if (l.contribution_id) e.members += sec; else e.global += sec;
    byFilter.set(l.filter, e);
  }
  const filterRows = [...byFilter.entries()].sort((a, b) => filterBand(a[0]).order - filterBand(b[0]).order);

  const viewerPanes = isMosaic ? panes : panes.slice(0, 1);
  const first = viewerPanes[0];
  const card = (c: TeamContribution, isMine: boolean) => {
    const own = allPanes.filter((p) => p.contribution_id === c.id);
    return (
      <ContributionCard key={c.id} c={c} isMine={isMine} editable={canEditContribution(c, user?.id, team)}
        isMosaic={own.length > 1} panes={own.map((p) => ({ id: p.id!, pane_number: p.pane_number }))}
        setups={isMine ? setups : []} lines={lines.filter((l) => l.contribution_id === c.id)}
        onSetup={(id) => chooseSetup(c, id)}
        onUpdate={(patch) => run(() => supabase.from("project_contributions").update(patch as any).eq("id", c.id))}
        onAddLine={(line) => run(() => supabase.from("project_acquisitions").insert({ ...line, project_id: projectId, contribution_id: c.id }))}
        onUpdateLine={(id, patch) => run(() => supabase.from("project_acquisitions").update(patch as any).eq("id", id))}
        onDeleteLine={(id) => run(() => supabase.from("project_acquisitions").delete().eq("id", id))} />
    );
  };

  return (
    <div className="space-y-6" data-testid="my-contribution">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">Ma contribution</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Votre setup, votre cadrage, vos objectifs par filtre et votre dossier sur votre poste.</p>
          </div>
          {!mine && user && <Button onClick={join}><UserPlus className="h-4 w-4 mr-1" /> Participer à ce projet</Button>}
        </CardHeader>
        {mine && <CardContent>{card(mine, true)}</CardContent>}
      </Card>

      {mine && (
        <ProjectCoordinates
          isMosaic={isMosaic} onMosaicChange={setIsMosaic}
          mode={mode} onModeChange={setMode} epoch={epoch} onEpochChange={setEpoch}
          ra={first?.ra || ""} dec={first?.dec || ""} angle={first?.position_angle?.toString() ?? ""}
          onRaChange={(v) => setPanes((p) => p.map((x, i) => (i === 0 ? { ...x, ra: v } : x)))}
          onDecChange={(v) => setPanes((p) => p.map((x, i) => (i === 0 ? { ...x, dec: v } : x)))}
          onAngleChange={(v) => setPanes((p) => p.map((x, i) => (i === 0 ? { ...x, position_angle: v === "" ? null : Number(v) } : x)))}
          panes={panes}
          onPaneCoordinatesChange={(idx, r, d) => setPanes((p) => p.map((x, i) => (i === idx ? { ...x, ra: r, dec: d } : x)))}
          onPaneAngleChange={(idx, v) => setPanes((p) => p.map((x, i) => (i === idx ? { ...x, position_angle: v === "" ? null : Number(v) } : x)))}
          onAddPane={() => setPanes((p) => [...p, { pane_number: p.length + 1, ra: p[p.length - 1]?.ra || defaultRa, dec: p[p.length - 1]?.dec || defaultDec, position_angle: p[p.length - 1]?.position_angle ?? null }])}
          onRemovePane={(idx) => setPanes((p) => p.filter((_, i) => i !== idx).map((x, i) => ({ ...x, pane_number: i + 1 })))}
          csvUpload={
            <input type="file" accept=".csv,text/csv" aria-label="Importer un CSV Telescopius" className="text-sm"
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const parsed = parseTelescopiusCsv(await f.text());
                if (!parsed.length) { toast({ title: "CSV vide ou illisible", variant: "destructive" }); return; }
                const kept = new Map(panes.map((p) => [p.pane_number, p.id]));
                setPanes(parsed.map((p) => ({ id: kept.get(p.pane_number), pane_number: p.pane_number, position_angle: p.position_angle, ...coordinatesToJ2000(p.ra, p.dec, epoch) })));
                setIsMosaic(parsed.length > 1);
              }} />
          }
          viewer={
            <div className="space-y-3">
              <SkyViewer
                ra={first?.ra || ""} dec={first?.dec || ""} positionAngle={first?.position_angle ?? 0}
                onRaDecChange={(r, d) => setPanes((p) => p.map((x, i) => (i === 0 ? { ...x, ra: r, dec: d } : x)))}
                onRotationChange={(a) => setPanes((p) => p.map((x, i) => (i === 0 ? { ...x, position_angle: a } : x)))}
                panes={isMosaic ? panes : undefined} isMosaic={isMosaic}
                setupFocalLength={mine.focal_length} setupSensorWidthMm={mine.sensor_width_mm} setupSensorHeightMm={mine.sensor_height_mm}
                setupName={mine.setup}
                participants={others.map((c) => ({
                  id: c.id, label: `${c.username}${c.setup ? ` · ${c.setup}` : ""}`, color: c.color,
                  focalLength: c.focal_length, sensorWidthMm: c.sensor_width_mm, sensorHeightMm: c.sensor_height_mm,
                  panes: allPanes.filter((p) => p.contribution_id === c.id),
                }))}
              />
              <div className="flex justify-end">
                <Button onClick={saveFraming} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Enregistrement..." : "Enregistrer mon cadrage"}</Button>
              </div>
            </div>
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rappel des autres membres</CardTitle>
          <p className="text-xs text-muted-foreground">Objectif global de l'équipe face à la somme des objectifs des membres.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {filterRows.length > 0 && (
            <table className="w-full max-w-md text-xs">
              <thead className="text-muted-foreground"><tr className="text-left">
                <th className="px-2 py-1 font-normal">Filtre</th>
                <th className="px-2 py-1 font-normal text-right">Objectif global</th>
                <th className="px-2 py-1 font-normal text-right">Membres</th>
              </tr></thead>
              <tbody>
                {filterRows.map(([f, v]) => {
                  const band = filterBand(f);
                  return (
                    <tr key={f} className="border-t border-border/40">
                      <td className="px-2 py-1"><span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: band.bg, color: band.fg }}>{f}</span></td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.global ? fmtH(v.global) : "—"}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{v.members ? fmtH(v.members) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {commonLines.length === 0 && filterRows.length === 0 && <p className="text-sm text-muted-foreground">Aucun objectif défini.</p>}
          {others.length === 0 ? <p className="text-sm text-muted-foreground">Aucun autre membre ne participe pour l'instant.</p> : others.map((c) => card(c, false))}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyContribution;
