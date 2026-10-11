import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ManualLine {
  id: string;
  label: string;
  filter: string;
  exposure_duration: number;
  bin: number;
  pane_id: string | null;
  acquired: number;
}

interface Props {
  projectId: string;
  contributionId: string | null;
  lines: ManualLine[];
  onChanged: () => void;
}

/** Mode manuel : saisie des brutes acquises par nuit, déduites de l'objectif. */
const ManualNightEntry = ({ projectId, contributionId, lines, onChanged }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [lineId, setLineId] = useState<string>("");
  const [qty, setQty] = useState("10");
  const [busy, setBusy] = useState(false);

  const key = ["manual-nights", projectId, contributionId];
  const { data: nights } = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = supabase
        .from("project_sessions")
        .select("id, started_at, session_batches(id, acquisition_id, sub_count, filter, exposure_duration)")
        .eq("project_id", projectId)
        .eq("source", "manual")
        .eq("created_by", user!.id);
      q = contributionId ? q.eq("contribution_id", contributionId) : q.is("contribution_id", null);
      const { data, error } = await q.order("started_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const lineFor = (id: string | null) => lines.find((l) => l.id === id);
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); onChanged(); };

  const setAcquired = async (id: string, delta: number) => {
    const { data, error } = await supabase.from("project_acquisitions").select("acquired").eq("id", id).single();
    if (error) throw error;
    const { error: e2 } = await supabase.from("project_acquisitions")
      .update({ acquired: Math.max(0, (data.acquired || 0) + delta) }).eq("id", id);
    if (e2) throw e2;
  };

  const add = async () => {
    const line = lineFor(lineId);
    const n = parseInt(qty, 10);
    if (!line || !date || !(n > 0)) return;
    setBusy(true);
    try {
      const night = format(date, "yyyy-MM-dd");
      let session = (nights || []).find((s) => s.started_at?.slice(0, 10) === night);
      if (!session) {
        const { data, error } = await supabase.from("project_sessions").insert({
          project_id: projectId, contribution_id: contributionId, created_by: user!.id,
          source: "manual", started_at: `${night}T20:00:00`,
        }).select("id, started_at, session_batches(id, acquisition_id, sub_count, filter, exposure_duration)").single();
        if (error) throw error;
        session = data as any;
      }
      const { error } = await supabase.from("session_batches").insert({
        session_id: session!.id, project_id: projectId, acquisition_id: line.id, pane_id: line.pane_id,
        filter: line.filter, exposure_duration: line.exposure_duration, sub_count: n, bin: line.bin, source: "manual",
      });
      if (error) throw error;
      await setAcquired(line.id, n);
      refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (sessionId: string, batch: { id: string; acquisition_id: string | null; sub_count: number }, last: boolean) => {
    try {
      const { error } = await supabase.from("session_batches").delete().eq("id", batch.id);
      if (error) throw error;
      if (batch.acquisition_id) await setAcquired(batch.acquisition_id, -batch.sub_count);
      if (last) await supabase.from("project_sessions").delete().eq("id", sessionId);
      refresh();
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Saisie manuelle par nuit</CardTitle>
        <p className="text-xs text-muted-foreground">Indiquez les brutes acquises chaque nuit : elles sont déduites de l'objectif.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-48 justify-start font-normal", !date && "text-muted-foreground")}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {date ? format(date, "d MMMM yyyy", { locale: fr }) : "Nuit du…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} locale={fr} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Select value={lineId} onValueChange={setLineId}>
            <SelectTrigger className="h-9 w-64"><SelectValue placeholder="Filtre / pose" /></SelectTrigger>
            <SelectContent>
              {lines.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 w-24" aria-label="Quantité" />
          <span className="text-xs text-muted-foreground pb-2">brutes</span>
          <Button size="sm" onClick={add} disabled={busy || !lineId || !date}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>

        {(nights || []).length > 0 && (
          <div className="space-y-2">
            {(nights || []).map((s: any) => (
              <div key={s.id} className="rounded-md bg-secondary/30 p-2">
                <p className="text-xs font-medium mb-1">
                  {s.started_at ? `Nuit du ${format(new Date(s.started_at), "d MMMM yyyy", { locale: fr })}` : "Historique"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(s.session_batches || []).map((b: any) => (
                    <span key={b.id} className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xs">
                      {lineFor(b.acquisition_id)?.label ?? `${b.filter} · ${Number(b.exposure_duration)} s`} : <b className="tabular-nums">{b.sub_count}</b>
                      <button className="text-muted-foreground hover:text-destructive" aria-label="Retirer"
                        onClick={() => remove(s.id, b, s.session_batches.length === 1)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualNightEntry;
