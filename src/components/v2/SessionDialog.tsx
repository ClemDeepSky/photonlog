import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/duration";

export interface PlanOption {
  id: string;
  filter: string;
  exposure_duration: number;
  bin: number;
  pane_id: string | null;
}

interface Row {
  filter: string;
  subs: string;
  exposure: string;
  acquisitionId: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contributionId: string;
  planOptions: PlanOption[];
  onSaved: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const SessionDialog = ({ open, onOpenChange, projectId, contributionId, planOptions, onSaved }: Props) => {
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([
    {
      filter: planOptions[0]?.filter || "L",
      subs: "",
      exposure: String(planOptions[0]?.exposure_duration ?? 300),
      acquisitionId: planOptions[0]?.id ?? null,
    },
  ]);

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const totalSeconds = rows.reduce(
    (s, r) => s + (parseInt(r.subs) || 0) * (parseFloat(r.exposure) || 0),
    0
  );
  const totalSubs = rows.reduce((s, r) => s + (parseInt(r.subs) || 0), 0);

  const save = async () => {
    const valid = rows.filter((r) => r.filter.trim() && (parseInt(r.subs) || 0) > 0);
    if (!valid.length) {
      toast({ title: "Ajoutez au moins un lot de poses", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const started = new Date(`${date}T20:00:00`).toISOString();
      const { data: session, error } = await supabase
        .from("project_sessions")
        .insert({
          project_id: projectId,
          contribution_id: contributionId,
          source: "manual",
          started_at: started,
          ended_at: started,
          note: note.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: batchError } = await supabase.from("session_batches").insert(
        valid.map((r) => {
          const plan = planOptions.find((p) => p.id === r.acquisitionId);
          return {
            session_id: session.id,
            project_id: projectId,
            acquisition_id: r.acquisitionId,
            pane_id: plan?.pane_id ?? null,
            filter: r.filter.trim(),
            exposure_duration: parseFloat(r.exposure) || 0,
            sub_count: parseInt(r.subs) || 0,
            bin: plan?.bin ?? 1,
            source: "manual",
          };
        })
      );
      if (batchError) throw batchError;

      toast({ title: "Session enregistrée", description: `${totalSubs} poses · ${formatDuration(totalSeconds)}` });
      setRows([
        {
          filter: planOptions[0]?.filter || "L",
          subs: "",
          exposure: String(planOptions[0]?.exposure_duration ?? 300),
          acquisitionId: planOptions[0]?.id ?? null,
        },
      ]);
      setNote("");
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle session</DialogTitle>
          <DialogDescription>
            Indiquez la nuit d'acquisition et vos lots de poses. Photonlog calcule le temps d'intégration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="session-date">Nuit du</Label>
              <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="session-note">Note (optionnel)</Label>
              <Textarea
                id="session-note"
                rows={1}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Transparence moyenne, lune à 40 %…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lots de poses</Label>
            {rows.map((row, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2 p-2 rounded-md bg-secondary/30">
                <div className="w-24">
                  <span className="text-[10px] text-muted-foreground">Filtre</span>
                  <Input
                    value={row.filter}
                    onChange={(e) => {
                      const plan = planOptions.find((p) => p.filter === e.target.value);
                      setRow(index, {
                        filter: e.target.value,
                        acquisitionId: plan?.id ?? null,
                        exposure: plan ? String(plan.exposure_duration) : row.exposure,
                      });
                    }}
                    list="plan-filters"
                    className="h-8"
                  />
                </div>
                <div className="w-24">
                  <span className="text-[10px] text-muted-foreground">Poses</span>
                  <Input
                    type="number"
                    min={0}
                    value={row.subs}
                    onChange={(e) => setRow(index, { subs: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="w-28">
                  <span className="text-[10px] text-muted-foreground">Durée (s)</span>
                  <Input
                    type="number"
                    min={0}
                    value={row.exposure}
                    onChange={(e) => setRow(index, { exposure: e.target.value })}
                    className="h-8"
                  />
                </div>
                <div className="flex-1 text-xs text-muted-foreground pb-2">
                  {formatDuration((parseInt(row.subs) || 0) * (parseFloat(row.exposure) || 0))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  disabled={rows.length === 1}
                  aria-label="Retirer ce lot"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <datalist id="plan-filters">
              {Array.from(new Set(planOptions.map((p) => p.filter))).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  {
                    filter: planOptions[0]?.filter || "L",
                    subs: "",
                    exposure: String(planOptions[0]?.exposure_duration ?? 300),
                    acquisitionId: planOptions[0]?.id ?? null,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un lot
            </Button>
          </div>

          <p className="text-sm">
            Total : <span className="font-semibold">{totalSubs} poses</span> ·{" "}
            <span className="font-semibold text-gradient">{formatDuration(totalSeconds)}</span>
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;
