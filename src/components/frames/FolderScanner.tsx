import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderSearch, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScanResult {
  filter: string;
  count: number;
  files: string[];
}

interface FolderScannerProps {
  acquisitions: { id: string; filter: string; quantity: number; acquired: number }[];
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
  // Direct match (case-insensitive)
  const direct = KNOWN_FILTERS.find((f) => f.toLowerCase() === lower);
  if (direct) return direct;
  return null;
}

function detectFilterFromPath(filePath: string): string | null {
  // Strategy 1: Check parent folder name (e.g., /Ha/file.fit)
  const parts = filePath.replace(/\\/g, "/").split("/");
  if (parts.length >= 2) {
    const parentFolder = parts[parts.length - 2];
    const fromFolder = normalizeFilter(parentFolder);
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

function isAstroFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ASTRO_EXTENSIONS.has(ext);
}

const FolderScanner = ({ acquisitions, onApplyResults, isPending }: FolderScannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[] | null>(null);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanning(true);
    setResults(null);

    try {
      const counts: Record<string, number> = {};
      let totalFiles = 0;
      let matchedFiles = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!isAstroFile(file.name)) continue;
        totalFiles++;

        const relativePath = (file as any).webkitRelativePath || file.name;
        const filter = detectFilterFromPath(relativePath);
        if (filter) {
          counts[filter] = (counts[filter] || 0) + 1;
          matchedFiles++;
        }
      }

      const scanResults = Object.entries(counts)
        .map(([filter, count]) => ({ filter, count }))
        .sort((a, b) => a.filter.localeCompare(b.filter));

      setResults(scanResults);

      if (scanResults.length === 0) {
        toast({
          title: "Aucun filtre détecté",
          description: `${totalFiles} fichier(s) trouvé(s) mais aucun filtre reconnu. Vérifiez la convention de nommage (ex: M42_Ha_300s_001.fit ou sous-dossiers par filtre).`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Scan terminé",
          description: `${matchedFiles} fichier(s) détecté(s) sur ${totalFiles} pour ${scanResults.length} filtre(s).`,
        });
      }
    } catch (err: any) {
      toast({ title: "Erreur de scan", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
      // Reset input
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const applyResults = () => {
    if (!results) return;

    const updates: { id: string; acquired: number }[] = [];
    for (const result of results) {
      // Find matching acquisition(s)
      const matching = acquisitions.filter((a) => a.filter === result.filter);
      for (const acq of matching) {
        updates.push({ id: acq.id, acquired: result.count });
      }
    }

    if (updates.length === 0) {
      toast({
        title: "Aucune correspondance",
        description: "Les filtres détectés ne correspondent à aucune acquisition configurée.",
        variant: "destructive",
      });
      return;
    }

    onApplyResults(updates);
    setResults(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={scanning || isPending}
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FolderSearch className="h-4 w-4 mr-1" />
          )}
          {scanning ? "Scan en cours..." : "Sélectionner le dossier local"}
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
              const hasMatch = acquisitions.some((a) => a.filter === r.filter);
              return (
                <div
                  key={r.filter}
                  className={`text-xs px-2 py-1 rounded-md border ${
                    hasMatch ? "border-primary/50 bg-primary/10" : "border-border bg-muted"
                  }`}
                >
                  <span className="font-semibold">{r.filter}</span>: {r.count} fichier(s)
                  {!hasMatch && <span className="text-muted-foreground ml-1">(pas configuré)</span>}
                </div>
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
