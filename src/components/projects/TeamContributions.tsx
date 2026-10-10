import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, UserPlus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MemberAvatar, useMemberAvatars } from "@/components/MemberAvatar";
import { toast } from "@/hooks/use-toast";
import { ensureContribution } from "@/lib/sessions";
import { filterBand } from "@/lib/filterBands";
import { canEditContribution, type TeamContribution } from "@/lib/teamContributions";

export interface PlanLine {
  id: string;
  filter: string;
  exposure_duration: number;
  quantity: number;
  acquired: number;
  bin: number;
  pane_id: string | null;
  contribution_id?: string | null;
}

interface Props {
  projectId: string;
  isMosaic: boolean;
  panes: { id: string; pane_number: number }[];
  team: { owner_id: string; management_mode: string } | null | undefined;
  contributions: TeamContribution[];
  acquisitions: PlanLine[];
  onChanged: () => void;
}

const FILTERS = ["L", "R", "V", "B", "S", "H", "O"];
const fmtH = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.round(s / 60)} min`);

const TeamContributions = ({ projectId, isMosaic, panes, team, contributions, acquisitions, onChanged }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const mine = contributions.find((c) => c.user_id === user?.id);

  const { data: setups } = useQuery({
    queryKey: ["my-equipment", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_profiles")
        .select("id, name, focal_length, pixel_size, sensor_width_px, sensor_height_px")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["team-contributions", projectId] });
    onChanged();
  };

  const run = async (fn: () => Promise<{ error: any } | void>) => {
    const res = await fn();
    if (res && res.error) toast({ title: "Erreur", description: res.error.message, variant: "destructive" });
    else refresh();
  };

  const join = () =>
    run(async () => {
      try {
        await ensureContribution(projectId, user!.id, { tracking_mode: "automatic" });
      } catch (e: any) {
        return { error: e };
      }
    });

  const updateContribution = (id: string, patch: Record<string, any>) =>
    run(async () => supabase.from("project_contributions").update(patch as any).eq("id", id));

  const chooseSetup = (c: TeamContribution, setupId: string) => {
    const s = setups?.find((x) => x.id === setupId);
    if (!s) return;
    const mm = (px: number | null) => (s.pixel_size && px ? (Number(s.pixel_size) * px) / 1000 : null);
    updateContribution(c.id, {
      equipment_profile_id: s.id,
      setup: s.name,
      focal_length: s.focal_length,
      sensor_width_mm: mm(s.sensor_width_px),
      sensor_height_mm: mm(s.sensor_height_px),
    });
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Contributions des participants</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Chacun définit son setup, son dossier et son plan. Le plan du projet est la somme des plans.
          </p>
        </div>
        {!mine && user && (
          <Button size="sm" onClick={join}>
            <UserPlus className="h-4 w-4 mr-1" /> Participer
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {contributions.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun participant pour l'instant.</p>
        )}
        {contributions.map((c) => (
          <ContributionCard
            key={c.id}
            c={c}
            isMine={c.user_id === user?.id}
            editable={canEditContribution(c, user?.id, team)}
            isMosaic={isMosaic}
            panes={panes}
            setups={c.user_id === user?.id ? setups || [] : []}
            lines={acquisitions.filter((a) => a.contribution_id === c.id)}
            onSetup={(id) => chooseSetup(c, id)}
            onUpdate={(patch) => updateContribution(c.id, patch)}
            onAddLine={(line) =>
              run(async () =>
                supabase.from("project_acquisitions").insert({ ...line, project_id: projectId, contribution_id: c.id }),
              )
            }
            onUpdateLine={(id, patch) => run(async () => supabase.from("project_acquisitions").update(patch as any).eq("id", id))}
            onDeleteLine={(id) => run(async () => supabase.from("project_acquisitions").delete().eq("id", id))}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface CardProps {
  c: TeamContribution;
  isMine: boolean;
  editable: boolean;
  isMosaic: boolean;
  panes: { id: string; pane_number: number }[];
  setups: { id: string; name: string }[];
  lines: PlanLine[];
  onSetup: (id: string) => void;
  onUpdate: (patch: Record<string, any>) => void;
  onAddLine: (line: { filter: string; exposure_duration: number; quantity: number; bin: number; pane_id: string | null }) => void;
  onUpdateLine: (id: string, patch: Record<string, any>) => void;
  onDeleteLine: (id: string) => void;
}

export const ContributionCard = ({ c, isMine, editable, isMosaic, panes, setups, lines, onSetup, onUpdate, onAddLine, onUpdateLine, onDeleteLine }: CardProps) => {
  const [filter, setFilter] = useState("L");
  const [expo, setExpo] = useState("300");
  const [qty, setQty] = useState("20");
  const [pane, setPane] = useState<string>("all");
  const [folder, setFolder] = useState(c.folder_path || "");
  const [pattern, setPattern] = useState(c.filename_pattern || "");
  const avatars = useMemberAvatars([c.user_id]);

  const planned = lines.reduce((s, l) => s + l.quantity * Number(l.exposure_duration), 0);
  const acquired = lines.reduce((s, l) => s + Math.min(l.acquired, l.quantity) * Number(l.exposure_duration), 0);
  const paneLabel = (id: string | null) => (id ? `P${panes.find((p) => p.id === id)?.pane_number ?? "?"}` : "—");
  const sorted = [...lines].sort(
    (a, b) =>
      (panes.find((p) => p.id === a.pane_id)?.pane_number ?? 0) - (panes.find((p) => p.id === b.pane_id)?.pane_number ?? 0) ||
      filterBand(a.filter).order - filterBand(b.filter).order ||
      Number(a.exposure_duration) - Number(b.exposure_duration),
  );

  const add = () => {
    const e = parseFloat(expo);
    const q = parseInt(qty, 10);
    if (!filter || !(e > 0) || !(q > 0)) return;
    const targets = isMosaic ? (pane === "all" ? panes.map((p) => p.id) : [pane]) : [null];
    for (const t of targets) onAddLine({ filter, exposure_duration: e, quantity: q, bin: 1, pane_id: t });
  };

  return (
    <div className="rounded-lg border border-border/60 p-3 space-y-3" style={{ borderLeft: `4px solid ${c.color}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <MemberAvatar userId={c.user_id} avatars={avatars} fallback={c.username?.[0]?.toUpperCase()} />
        <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
        <span className="font-medium">{c.username}</span>
        {isMine && <Badge variant="secondary" className="text-[10px]">Moi</Badge>}
        {!editable && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Lecture seule" />}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {fmtH(acquired)} / {fmtH(planned)}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Setup</p>
          {editable && isMine ? (
            <Select value={c.equipment_profile_id || undefined} onValueChange={onSetup}>
              <SelectTrigger className="h-8"><SelectValue placeholder={c.setup || "Choisir un setup"} /></SelectTrigger>
              <SelectContent>
                {setups.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{c.setup || "—"}</p>
          )}
          {c.focal_length && c.sensor_width_mm ? (
            <p className="text-[11px] text-muted-foreground mt-1">
              {c.focal_length} mm · {c.sensor_width_mm.toFixed(1)}×{(c.sensor_height_mm ?? 0).toFixed(1)} mm
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Mode</p>
          {editable ? (
            <Select value={c.tracking_mode} onValueChange={(v) => onUpdate({ tracking_mode: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automatique (dossier)</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm">{c.tracking_mode === "automatic" ? "Automatique" : "Manuel"}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Dossier d'acquisitions</p>
          {editable ? (
            <Input className="h-8" value={folder} onChange={(e) => setFolder(e.target.value)}
              onBlur={() => folder !== (c.folder_path || "") && onUpdate({ folder_path: folder || null })}
              placeholder="D:\Astro\M31" />
          ) : (
            <p className="text-sm truncate">{c.folder_path || "—"}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Structure du nom de fichier</p>
          {editable ? (
            <Input className="h-8" value={pattern} onChange={(e) => setPattern(e.target.value)}
              onBlur={() => pattern !== (c.filename_pattern || "") && onUpdate({ filename_pattern: pattern || null })}
              placeholder="Pattern du projet par défaut" />
          ) : (
            <p className="text-sm truncate">{c.filename_pattern || "Pattern du projet"}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr className="text-left">
              {isMosaic && <th className="px-2 py-1 font-normal">Panneau</th>}
              <th className="px-2 py-1 font-normal">Filtre</th>
              <th className="px-2 py-1 font-normal text-right">Pose</th>
              <th className="px-2 py-1 font-normal text-right">Objectif</th>
              <th className="px-2 py-1 font-normal text-right">Acquises</th>
              <th className="px-2 py-1 font-normal text-right">Intégration</th>
              {editable && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const band = filterBand(l.filter);
              return (
                <tr key={l.id} className="border-t border-border/40">
                  {isMosaic && <td className="px-2 py-1">{paneLabel(l.pane_id)}</td>}
                  <td className="px-2 py-1">
                    <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: band.bg, color: band.fg }}>{l.filter}</span>
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{Number(l.exposure_duration)} s</td>
                  <td className="px-2 py-1 text-right">
                    {editable ? (
                      <Input type="number" min={0} defaultValue={l.quantity} className="h-7 w-20 ml-auto text-right"
                        onBlur={(e) => { const q = parseInt(e.target.value, 10); if (q >= 0 && q !== l.quantity) onUpdateLine(l.id, { quantity: q }); }} />
                    ) : <span className="tabular-nums">{l.quantity}</span>}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{l.acquired}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmtH(l.acquired * Number(l.exposure_duration))}</td>
                  {editable && (
                    <td className="px-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Supprimer la ligne" onClick={() => onDeleteLine(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-2 text-muted-foreground">Aucune acquisition prévue.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex flex-wrap items-end gap-2">
          {isMosaic && (
            <Select value={pane} onValueChange={setPane}>
              <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les panneaux</SelectItem>
                {panes.map((p) => <SelectItem key={p.id} value={p.id}>Panneau {p.pane_number}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input type="number" min={1} value={expo} onChange={(e) => setExpo(e.target.value)} className="h-8 w-20" aria-label="Pose (s)" />
            <span className="text-xs text-muted-foreground">s ×</span>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="h-8 w-20" aria-label="Quantité" />
          </div>
          <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </div>
      )}
    </div>
  );
};

export default TeamContributions;
