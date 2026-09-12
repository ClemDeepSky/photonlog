import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  listLocalFiles,
  entriesFromInputFileList,
  type LocalFileEntry,
} from "@/lib/localFiles";
import { isAstroFile, parseFrameName } from "@/lib/frameNames";

export interface RefreshAcquisition {
  id: string;
  filter: string;
  paneNumber: number | null;
}

interface FolderRefreshProps {
  projectId: string;
  /** Modèle de nommage du projet (peut être vide) */
  pattern?: string | null;
  acquisitions: RefreshAcquisition[];
  isMosaic: boolean;
  onDone?: () => void;
}

const CHUNK = 400;

const FolderRefresh = ({ projectId, pattern, acquisitions, isMosaic, onDone }: FolderRefreshProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const findAcquisitionId = (filter: string | null, paneNumber: number | null) => {
    if (!filter) return null;
    const sameFilter = acquisitions.filter((a) => a.filter === filter);
    if (!isMosaic) return sameFilter[0]?.id ?? null;
    if (paneNumber == null) return null;
    return sameFilter.find((a) => a.paneNumber === paneNumber)?.id ?? null;
  };

  const process = async (entries: LocalFileEntry[]) => {
    // Fichiers déjà indexés : on ne les recompte jamais.
    const { data: known, error: knownError } = await supabase
      .from("project_frames")
      .select("relative_path")
      .eq("project_id", projectId);
    if (knownError) throw knownError;
    const knownPaths = new Set((known || []).map((k) => k.relative_path));

    const rows: any[] = [];
    let seen = 0;
    let skippedType = 0;

    for (const entry of entries) {
      if (!isAstroFile(entry.name)) continue;
      seen++;
      if (knownPaths.has(entry.relativePath)) continue;

      const parsed = parseFrameName(entry.relativePath, pattern);
      if (parsed.imageType && parsed.imageType !== "LIGHT") {
        skippedType++;
        continue;
      }

      rows.push({
        project_id: projectId,
        acquisition_id: findAcquisitionId(parsed.filter, parsed.paneNumber),
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

    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase.from("project_frames").insert(rows.slice(i, i + CHUNK));
      if (error) throw error;
    }

    // Recomptage automatique des acquisitions à partir de l'index complet.
    const { data: allFrames, error: framesError } = await supabase
      .from("project_frames")
      .select("filter, pane_number")
      .eq("project_id", projectId);
    if (framesError) throw framesError;

    const counts = new Map<string, number>();
    for (const f of allFrames || []) {
      if (!f.filter) continue;
      const key = `${isMosaic ? f.pane_number ?? "none" : "all"}|${f.filter}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    let updated = 0;
    for (const acq of acquisitions) {
      const key = `${isMosaic ? acq.paneNumber ?? "none" : "all"}|${acq.filter}`;
      const count = counts.get(key);
      if (count === undefined) continue;
      const { error } = await supabase
        .from("project_acquisitions")
        .update({ acquired: count })
        .eq("id", acq.id);
      if (error) throw error;
      updated++;
    }

    const unmatched = rows.filter((r) => !r.acquisition_id).length;
    toast({
      title: rows.length ? `${rows.length} nouvelle(s) image(s)` : "Aucune nouvelle image",
      description:
        `${seen} fichier(s) dans le dossier, ${rows.length} ajouté(s) à l'index, ${updated} ligne(s) d'acquisition mise(s) à jour.` +
        (skippedType ? ` ${skippedType} fichier(s) ignoré(s) (calibration).` : "") +
        (unmatched ? ` ${unmatched} sans filtre/panneau reconnu.` : ""),
    });

    onDone?.();
  };

  const run = async (entries: LocalFileEntry[]) => {
    setBusy(true);
    try {
      await process(entries);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      const entries = await listLocalFiles();
      setBusy(false);
      if (entries) await run(entries);
    } catch (err: any) {
      setBusy(false);
      const msg = String(err?.message || "");
      const unavailable =
        msg.includes("non supporté") ||
        err?.name === "SecurityError" ||
        err?.name === "NotAllowedError" ||
        msg.includes("Cross origin") ||
        msg.includes("cross-origin") ||
        msg.includes("sub frames");
      if (unavailable) {
        inputRef.current?.click();
        return;
      }
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const entries = entriesFromInputFileList(files);
    if (inputRef.current) inputRef.current.value = "";
    await run(entries);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleRefresh} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
        {busy ? "Analyse..." : "Rafraîchir le dossier"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        /* @ts-ignore */
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleInput}
      />
    </>
  );
};

export default FolderRefresh;
