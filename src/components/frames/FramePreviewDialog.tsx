import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Loader2, Trash2, ZoomIn } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { decodeFitsToCanvas, isFitsName, stretchToCanvas, STRETCH_LEVELS, type FitsPreview } from "@/lib/fitsPreview";

interface FramePreviewDialogProps {
  file: File | null;
  relativePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suppression définitive du fichier sur le disque (Chrome/Edge uniquement). */
  onDelete?: () => Promise<void>;
}

const LENS_SIZE = 180;
const LENS_ZOOM = 2;

const FramePreviewDialog = ({ file, relativePath, open, onOpenChange, onDelete }: FramePreviewDialogProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stretch, setStretch] = useState(1);
  const [isFits, setIsFits] = useState(false);
  const [cross, setCross] = useState<{ clientX: number; clientY: number; px: number; py: number } | null>(null);
  const [lensPos, setLensPos] = useState<{ x: number; y: number } | null>(null);
  const fitsRef = useRef<FitsPreview | null>(null);
  const fullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullImageRef = useRef<HTMLImageElement | null>(null);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgBoxRef = useRef<HTMLDivElement | null>(null);
  const canDelete = !!onDelete && typeof (window as any).showDirectoryPicker === "function";

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setSrc(null);
    setError(null);
    setDims(null);
    setCross(null);
    setLensPos(null);
    fitsRef.current = null;
    fullCanvasRef.current = null;
    fullImageRef.current = null;
    if (!file || !open) return;

    const run = async () => {
      setLoading(true);
      try {
        if (isFitsName(file.name)) {
          setIsFits(true);
          const preview = await decodeFitsToCanvas(file);
          if (cancelled) return;
          fitsRef.current = preview;
          const canvas = stretchToCanvas(preview, stretch);
          setSrc(canvas.toDataURL("image/png"));
          // Version pleine résolution pour la loupe (×2 sur les pixels réels).
          fullCanvasRef.current = stretchToCanvas(preview, stretch, Math.max(preview.width, preview.height));
          setDims(`${preview.width} × ${preview.height} px`);
        } else {
          setIsFits(false);
          const url = URL.createObjectURL(file);
          revoke = url;
          const img = new Image();
          img.src = url;
          try {
            await img.decode();
            fullImageRef.current = img;
          } catch {
            /* image non décodable : pas de loupe */
          }
          if (!cancelled) setSrc(url);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Aperçu impossible pour ce fichier.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();

    return () => {
      cancelled = true;
      if (revoke) URL.revokeObjectURL(revoke);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, open]);

  // Réétirement à la demande pour les FITS.
  const changeStretch = (level: number) => {
    setStretch(level);
    const preview = fitsRef.current;
    if (!preview) return;
    const canvas = stretchToCanvas(preview, level);
    setSrc(canvas.toDataURL("image/png"));
    fullCanvasRef.current = stretchToCanvas(preview, level, Math.max(preview.width, preview.height));
  };

  // Loupe : dessine la zone sous le curseur à 200 % des pixels réels du fichier.
  const onImageMove = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px < 0 || py < 0 || px > rect.width || py > rect.height) {
      setCross(null);
      setLensPos(null);
      return;
    }
    const source = fullCanvasRef.current ?? fullImageRef.current;
    const lensCanvas = lensCanvasRef.current;
    if (!source || !lensCanvas) {
      setCross(null);
      setLensPos(null);
      return;
    }
    const natW = fullCanvasRef.current ? fullCanvasRef.current.width : (fullImageRef.current?.naturalWidth ?? 0);
    const natH = fullCanvasRef.current ? fullCanvasRef.current.height : (fullImageRef.current?.naturalHeight ?? 0);
    if (!natW || !natH) {
      setCross(null);
      setLensPos(null);
      return;
    }
    const natX = (px / rect.width) * natW;
    const natY = (py / rect.height) * natH;
    const sw = LENS_SIZE / LENS_ZOOM;
    const sx = natX - sw / 2;
    const sy = natY - sw / 2;
    const ctx = lensCanvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, LENS_SIZE, LENS_SIZE);
    ctx.drawImage(source, sx, sy, sw, sw, 0, 0, LENS_SIZE, LENS_SIZE);

    // Décale la loupe en dessous, à gauche ou à droite selon la position horizontale.
    const margin = 24;
    const lensX = e.clientX < window.innerWidth / 2 ? e.clientX + LENS_SIZE / 2 + margin : e.clientX - LENS_SIZE / 2 - margin;
    const lensY = e.clientY + LENS_SIZE / 2 + margin;
    setLensPos({ x: lensX, y: lensY });
    setCross({ clientX: e.clientX, clientY: e.clientY, px, py });
  };

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(relativePath || file?.name || "");
      toast({ title: "Chemin copié", description: relativePath || file?.name });
    } catch {
      toast({ title: "Copie impossible", description: relativePath || file?.name, variant: "destructive" });
    }
  };

  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw]">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium break-all">{file?.name || "Aperçu"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={copyPath}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              Copier le chemin
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={download}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Télécharger
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                Supprimer le fichier
              </Button>
            )}
            {isFits && (
              <div className="ml-2 flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Étirement :</span>
                {STRETCH_LEVELS.map((l) => (
                  <Button
                    key={l.id}
                    size="sm"
                    variant={stretch === l.id ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => changeStretch(l.id)}
                  >
                    {l.label}
                  </Button>
                ))}
              </div>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <ZoomIn className="h-3.5 w-3.5" />
              Survolez l'image pour la loupe ×2
            </span>
            {dims && <span className="text-xs text-muted-foreground">{dims}</span>}
          </div>

          <p className="text-xs text-muted-foreground break-all">{relativePath}</p>

          <div
            ref={imgBoxRef}
            className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-md border border-border/50 bg-muted/20"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Lecture du fichier…
              </span>
            ) : error ? (
              <span className="p-4 text-sm text-muted-foreground">{error}</span>
            ) : src ? (
              <img
                src={src}
                alt={file?.name || "Aperçu de la brute"}
                className="max-h-[72vh] w-auto cursor-none"
                onMouseMove={onImageMove}
                onMouseLeave={() => setLens(null)}
              />
            ) : null}
          </div>
        </div>

        <canvas
          ref={lensCanvasRef}
          width={LENS_SIZE}
          height={LENS_SIZE}
          className="pointer-events-none fixed z-50 rounded-full border-2 border-primary/70 shadow-xl"
          style={{
            display: lens && src ? "block" : "none",
            left: (lens?.x ?? 0) - LENS_SIZE / 2,
            top: (lens?.y ?? 0) - LENS_SIZE / 2,
            width: LENS_SIZE,
            height: LENS_SIZE,
          }}
        />

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ce fichier ?</AlertDialogTitle>
              <AlertDialogDescription className="break-all">
                {file?.name} sera supprimé de votre disque (sans passage par la corbeille) et retiré de
                l'index Photonlog. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  if (!onDelete) return;
                  setDeleting(true);
                  try {
                    await onDelete();
                    setConfirmOpen(false);
                    onOpenChange(false);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default FramePreviewDialog;
