import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderSearch, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  listLocalFiles,
  supportsDirectoryPicker,
  entriesFromInputFileList,
  type LocalFileEntry,
} from "@/lib/localFiles";

interface ScanResult {
  filter: string;
  paneNumber: number | null;
  count: number;
  files: string[];
}

interface ScannerAcquisition {
  id: string;
  filter: string;
  quantity: number;
  acquired: number;
  paneNumber?: number | null;
}

interface FolderScannerProps {
  acquisitions: ScannerAcquisition[];
  onApplyResults: (updates: { id: string; acquired: number }[]) => void;
  isPending?: boolean;
}

// Common astrophotography file extensions
const ASTRO_EXTENSIONS = new Set([
  "fit", "fits", "fts", "xisf", "tif", "tiff", "cr2", "cr3", "nef", "arw", "png", "jpg", "jpeg",
]);

// Known filter names (case-insensitive matching)
const KNOWN_FILTERS = ["L", "R", "G", "B", "Ha", "OIII", "SII", "UV", "IR", "Lum", "Red", "Green", "Blue"];

const FILTER_ALIASES: Record<string, string> = {
  lum: "L", luminance: "L", luminosity: "L",
  red: "R", green: "G", blue: "B",
  halpha: "Ha", h_alpha: "Ha", "h-alpha": "Ha",
  oiii: "OIII", o3: "OIII",
  sii: "SII", s2: "SII",
};

function normalizeFilter(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (FILTER_ALIASES[lower]) return FILTER_ALIASES[lower];
  const direct = KNOWN_FILTERS.find((f) => f.toLowerCase() === lower);
  if (direct) return direct;
  return null;
}

function detectFilterFromPath(filePath: string): string | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  // Strategy 1: any folder in the path named after a filter (closest first)
  for (let i = parts.length - 2; i >= 0; i--) {
    const fromFolder = normalizeFilter(parts[i]);
    if (fromFolder) return fromFolder;
  }

  // Strategy 2: Parse filename segments separated by _ or -
  const filename = parts[parts.length - 1];
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  const segments = nameWithoutExt.split(/[_\-\s]+/);
  for (const seg of segments) {
    const fromSeg = normalizeFilter(seg);
    if (fromSeg) return fromSeg;
  }

  return null;
}

// Panel patterns: Panel 1, panneau_2, P3, pane-4, tile5, mosaic_2, M1
const PANE_PATTERNS = [
  /\b(?:panneau|panel|pane|tile|tuile|mosaic|mosaique)[\s_\-]*0*(\d{1,3})\b/i,
  /\b[pt]0*(\d{1,3})\b/i,
];

function detectPaneFromSegment(segment: string): number | null {
  for (const re of PANE_PATTERNS) {
    const m = segment.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function detectPaneFromPath(filePath: string): number | null {
  const parts = filePath.replace(/\\/g, "/").split("/");
  // Folders first (closest to the file), then the filename segments
  for (let i = parts.length - 2; i >= 0; i--) {
    const found = detectPaneFromSegment(parts[i]);
    if (found !== null) return found;
  }
  const nameWithoutExt = parts[parts.length - 1].replace(/\.[^.]+$/, "");
  for (const seg of nameWithoutExt.split(/[_\-\s]+/)) {
    const found = detectPaneFromSegment(seg);
    if (found !== null) return found;
  }
  return null;
}

function isAstroFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ASTRO_EXTENSIONS.has(ext);
}

const FolderScanner = ({ acquisitions, onApplyResults, isPending }: FolderScannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[] | null>(null);

  const hasPanes = acquisitions.some((a) => a.paneNumber != null);

  // Find the acquisitions matching a scan result (filter + pane when relevant)
  const matchingAcqs = (r: ScanResult) => {
    const sameFilter = acquisitions.filter((a) => a.filter === r.filter);
    if (!hasPanes) return sameFilter;
    if (r.paneNumber == null) return [];
    return sameFilter.filter((a) => a.paneNumber === r.paneNumber);
  };

  const analyzeEntries = (entries: LocalFileEntry[]) => {
    const counts: Record<string, { filter: string; paneNumber: number | null; count: number; files: string[] }> = {};
    let totalFiles = 0;
    let matchedFiles = 0;

    for (const entry of entries) {
      if (!isAstroFile(entry.name)) continue;
      totalFiles++;

      const filter = detectFilterFromPath(entry.relativePath);
      if (!filter) continue;
      const paneNumber = hasPanes ? detectPaneFromPath(entry.relativePath) : null;
      const key = `${paneNumber ?? "none"}|${filter}`;
      if (!counts[key]) counts[key] = { filter, paneNumber, count: 0, files: [] };
      counts[key].count++;
      counts[key].files.push(entry.relativePath);
      matchedFiles++;
    }

    const scanResults = Object.values(counts).sort(
      (a, b) => (a.paneNumber ?? 0) - (b.paneNumber ?? 0) || a.filter.localeCompare(b.filter)
    );

    setResults(scanResults);

    if (scanResults.length === 0) {
      toast({
        title: "Aucun filtre détecté",
        description: `${totalFiles} fichier(s) trouvé(s) mais aucun filtre reconnu. Vérifiez la convention de nommage (ex: M42_Panneau1_Ha_300s_001.fit ou sous-dossiers par panneau/filtre).`,
        variant: "destructive",
      });
    } else {
      const unassigned = hasPanes ? scanResults.filter((r) => r.paneNumber == null).length : 0;
      toast({
        title: "Scan terminé",
        description: `${matchedFiles} fichier(s) détecté(s) sur ${totalFiles}, réparti(s) en ${scanResults.length} groupe(s)${
          unassigned ? ` — ${unassigned} groupe(s) sans panneau identifié` : ""
        }.`,
      });
    }
  };

  // Méthode principale : File System Access API — lit uniquement les NOMS
  // des fichiers via des handles, sans jamais charger leur contenu.
  const handlePickDirectory = async () => {
    setScanning(true);
    setResults(null);
    try {
      const entries = await listLocalFiles();
      if (entries) analyzeEntries(entries); // null = annulé par l'utilisateur
    } catch (err: any) {
      const msg = String(err?.message || "");
      const unavailable =
        msg.includes("non supporté") ||
        err?.name === "SecurityError" ||
        err?.name === "NotAllowedError" ||
        msg.includes("Cross origin") ||
        msg.includes("cross-origin") ||
        msg.includes("sub frames");
      if (unavailable) {
        inputRef.current?.click(); // fallback : lecture des noms uniquement
        return;
      }
      toast({ title: "Erreur de scan", description: err.message, variant: "destructive" });

    } finally {
      setScanning(false);
    }
  };

  // Fallback : input webkitdirectory (Firefox, Safari) — noms uniquement.
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanning(true);
    setResults(null);

    try {
      analyzeEntries(entriesFromInputFileList(files));
    } catch (err: any) {
      toast({ title: "Erreur de scan", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyResults = () => {
    if (!results) return;

    const updates: { id: string; acquired: number }[] = [];
    for (const result of results) {
      for (const acq of matchingAcqs(result)) {
        updates.push({ id: acq.id, acquired: result.count });
      }
    }

    if (updates.length === 0) {
      toast({
        title: "Aucune correspondance",
        description: hasPanes
          ? "Les panneaux/filtres détectés ne correspondent à aucune acquisition configurée."
          : "Les filtres détectés ne correspondent à aucune acquisition configurée.",
        variant: "destructive",
      });
      return;
    }

    onApplyResults(updates);
    setResults(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Seule la liste des noms de fichiers est lue — aucun fichier n'est importé ni envoyé.
        {hasPanes && " Les fichiers sont comptabilisés par panneau et par filtre."}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePickDirectory}
          disabled={scanning || isPending}
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FolderSearch className="h-4 w-4 mr-1" />
          )}
          {scanning ? "Lecture en cours..." : "Importer la liste des fichiers du dossier"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          /* @ts-ignore */
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleScan}
        />
      </div>

      {results && results.length > 0 && (
        <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
          <p className="text-sm font-medium">Résultat du scan :</p>
          <div className="flex flex-wrap gap-2">
            {results.map((r) => {
              const hasMatch = matchingAcqs(r).length > 0;
              const label = hasPanes
                ? `${r.paneNumber != null ? `Panneau ${r.paneNumber}` : "Panneau ?"} · ${r.filter}`
                : r.filter;
              return (
                <details
                  key={`${r.paneNumber ?? "none"}-${r.filter}`}
                  className={`text-xs px-2 py-1 rounded-md border ${
                    hasMatch ? "border-primary/50 bg-primary/10" : "border-border bg-muted"
                  }`}
                >
                  <summary className="cursor-pointer select-none">
                    <span className="font-semibold">{label}</span>: {r.count} fichier(s)
                    {!hasMatch && <span className="text-muted-foreground ml-1">(pas configuré)</span>}
                  </summary>
                  <ul className="mt-1 max-h-32 overflow-y-auto space-y-0.5 text-muted-foreground">
                    {r.files.map((f) => (
                      <li key={f} className="truncate" title={f}>{f}</li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={applyResults} disabled={isPending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Appliquer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setResults(null)}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderScanner;
