import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { entriesFromDirHandle, type LocalFileEntry } from "@/lib/localFiles";
import { getProjectDirHandle, ensureReadPermission } from "@/lib/dirHandleStore";
import { getCachedProjectEntries } from "@/lib/localFileCache";

import { isAstroFile, parseFrameName } from "@/lib/frameNames";
import { matchFrameAcquisition } from "@/lib/frameAcquisition";

export interface RefreshAcquisition {
  id: string;
  filter: string;
  paneNumber: number | null;
  /** Durée d'exposition prévue (s) — permet plusieurs expositions par filtre */
  exposure?: number | null;
}

interface FolderRefreshProps {
  projectId: string;
  /** Modèle de nommage du projet (peut être vide) */
  pattern?: string | null;
  acquisitions: RefreshAcquisition[];
  isMosaic: boolean;
  /** Projets Team : contribution de l'utilisateur. Les brutes lui sont rattachées. */
  contributionId?: string | null;
  onDone?: () => void;
}

const CHUNK = 400;

const FolderRefresh = ({ projectId, pattern, acquisitions, isMosaic, contributionId = null, onDone }: FolderRefreshProps) => {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ open: boolean; before: number | null; added: number | null; progress: number; step: string; done: boolean; error?: string }>({
    open: false, before: null, added: null, progress: 0, step: "", done: false,
  });
  const upd = (p: Partial<typeof report>) => setReport((r) => ({ ...r, ...p }));

  const findAcquisitionId = (filter: string | null, paneNumber: number | null, exposure: number | null) =>
    matchFrameAcquisition(acquisitions, filter, paneNumber, exposure);

  const process = async (entries: LocalFileEntry[]) => {
    // Réindexation complète : le dossier est la référence. Les images déjà
    // indexées sont mises à jour (jamais dupliquées), celles qui ont disparu
    // du dossier sont retirées de l'index.
    const known: { id: string; relative_path: string }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      let q = supabase
        .from("project_frames")
        .select("id, relative_path")
        .eq("project_id", projectId);
      q = contributionId ? q.eq("contribution_id", contributionId) : q.is("contribution_id", null);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw error;
      known.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    const knownPaths = new Set(known.map((k) => k.relative_path));
    upd({ before: known.length, progress: 15, step: "Analyse des fichiers…" });

    const rows: any[] = [];
    const currentPaths = new Set<string>();
    let seen = 0;
    let skippedType = 0;
    let matched = 0;

    for (const entry of entries) {
      if (!isAstroFile(entry.name)) continue;
      seen++;
      if (currentPaths.has(entry.relativePath)) continue; // même chemin listé deux fois
      const parsed = parseFrameName(entry.relativePath, pattern);
      if (parsed.matchedPattern) matched++;
      if (parsed.imageType && parsed.imageType !== "LIGHT") {
        skippedType++;
        continue;
      }
      currentPaths.add(entry.relativePath);

      rows.push({
        project_id: projectId,
        contribution_id: contributionId,
        acquisition_id: findAcquisitionId(parsed.filter, parsed.paneNumber, parsed.exposureDuration),
        relative_path: entry.relativePath,
        file_name: entry.name,
        filter: parsed.filter,
        pane_number: parsed.paneNumber,
        captured_at: parsed.capturedAt,
        exposure_duration: parsed.exposureDuration,
        fwhm: parsed.fwhm,
        eccentricity: parsed.eccentricity,
        hfr: parsed.hfr,
        star_count: parsed.starCount,
        sensor_temp: parsed.sensorTemp,
        frame_nr: parsed.frameNr,
      });
    }

    const added = rows.filter((r) => !knownPaths.has(r.relative_path)).length;
    upd({ added, progress: 25, step: "Indexation des brutes…" });

    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from("project_frames")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "project_id,relative_path" });
      if (error) throw error;
      upd({ progress: 25 + Math.round((Math.min(rows.length, i + CHUNK) / Math.max(rows.length, 1)) * 55) });
    }
    upd({ progress: 82, step: "Nettoyage et recomptage…" });

    // Suppression des images absentes du dossier.
    const goneIds = known.filter((k) => !currentPaths.has(k.relative_path)).map((k) => k.id);
    for (let i = 0; i < goneIds.length; i += CHUNK) {
      const { error } = await supabase
        .from("project_frames")
        .delete()
        .in("id", goneIds.slice(i, i + CHUNK));
      if (error) throw error;
    }

    // Recomptage automatique des acquisitions à partir du contenu réel du dossier.
    // Comptage par ligne d'acquisition rattachée (gère plusieurs durées par filtre).
    const counts = new Map<string, number>();
    for (const f of rows) {
      if (!f.acquisition_id) continue;
      counts.set(f.acquisition_id, (counts.get(f.acquisition_id) || 0) + 1);
    }

    let updated = 0;
    for (const acq of acquisitions) {
      const count = counts.get(acq.id) ?? 0;
      const { error } = await supabase
        .from("project_acquisitions")
        .update({ acquired: count })
        .eq("id", acq.id);
      if (error) throw error;
      updated++;
    }

    upd({ progress: 100, step: "Terminé", done: true });
    toast({
      title: `${rows.length} image(s) indexée(s)`,
      description:
        `${seen} fichier(s) dans le dossier, ${added} nouvelle(s), ${goneIds.length} retirée(s) car absente(s), ${updated} ligne(s) d'acquisition mise(s) à jour.` +
        (pattern
          ? matched
            ? ` Modèle de nommage reconnu sur ${matched} fichier(s).`
            : " Le modèle de nommage ne correspond à aucun nom de fichier."
          : " Aucun modèle de nommage renseigné dans le projet."),
    });

    onDone?.();
  };

  const run = async (entries: LocalFileEntry[]) => {
    setBusy(true);
    try {
      await process(entries);
    } catch (err: any) {
      upd({ done: true, error: err.message, step: "Erreur" });
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setReport({ open: true, before: null, added: null, progress: 5, step: "Lecture du dossier…", done: false });
    // Le dossier est défini une fois pour toutes dans la configuration du
    // projet : on relit le dossier mémorisé, sans rien redemander.
    try {
      const saved = await getProjectDirHandle(projectId);
      if (saved) {
        const allowed = await ensureReadPermission(saved);
        if (allowed) {
          setBusy(true);
          const entries = await entriesFromDirHandle(saved);
          setBusy(false);
          await run(entries);
          return;
        }
      }
      // Secours : dossier chargé via le champ classique (aperçu intégré) —
      // la liste des noms est conservée en mémoire pour la session.
      const cached = getCachedProjectEntries(projectId);
      if (cached && cached.length > 0) {
        await run(cached);
        return;
      }
      upd({ done: true, error: "Aucun dossier mémorisé. Définissez le dossier local dans la configuration du projet.", step: "Erreur" });
      toast({
        title: "Aucun dossier mémorisé",
        description: "Définissez le dossier local dans la configuration du projet (bouton dossier à côté du champ « Dossier local »).",
        variant: "destructive",
      });
    } catch (err: any) {
      setBusy(false);
      upd({ done: true, error: err.message, step: "Erreur" });
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Button size="lg" onClick={handleRefresh} disabled={busy} className="gap-2 font-semibold shadow-lg shadow-primary/20">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        <span className="flex flex-col items-start leading-tight">
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
            <Sparkles className="h-3 w-3" /> Mode intelligent
          </span>
          {busy ? "Analyse…" : "Actualiser les acquisitions"}
        </span>
      </Button>
      <Dialog open={report.open} onOpenChange={(o) => { if (!o && report.done) setReport((r) => ({ ...r, open: false })); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Actualisation des acquisitions</DialogTitle>
            <DialogDescription>{report.error ?? report.step}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Brutes avant import</p>
              <p className="text-2xl font-bold">{report.before ?? "…"}</p>
            </div>
            <div className="rounded-md border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">Brutes ajoutées</p>
              <p className="text-2xl font-bold text-primary">{report.added != null ? `+${report.added}` : "…"}</p>
            </div>
          </div>
          <Progress value={report.progress} className="h-2" />
          <DialogFooter>
            <Button disabled={!report.done} onClick={() => setReport((r) => ({ ...r, open: false }))}>
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FolderRefresh;
