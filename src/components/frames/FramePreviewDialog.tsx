import { useEffect, useState } from "react";
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
import { Copy, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { decodeFitsToCanvas, isFitsName } from "@/lib/fitsPreview";

interface FramePreviewDialogProps {
  file: File | null;
  relativePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suppression définitive du fichier sur le disque (Chrome/Edge uniquement). */
  onDelete?: () => Promise<void>;
}

const FramePreviewDialog = ({ file, relativePath, open, onOpenChange, onDelete }: FramePreviewDialogProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dims, setDims] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = !!onDelete && typeof (window as any).showDirectoryPicker === "function";

  useEffect(() => {
    let revoke: string | null = null;
    let cancelled = false;
    setSrc(null);
    setError(null);
    setDims(null);
    if (!file || !open) return;

    const run = async () => {
      setLoading(true);
      try {
        if (isFitsName(file.name)) {
          const { canvas, width, height } = await decodeFitsToCanvas(file);
          if (cancelled) return;
          setSrc(canvas.toDataURL("image/png"));
          setDims(`${width} × ${height} px`);
        } else {
          const url = URL.createObjectURL(file);
          revoke = url;
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
  }, [file, open]);

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
      <DialogContent className="max-w-4xl">
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
            {dims && <span className="text-xs text-muted-foreground">{dims}</span>}
          </div>

          <p className="text-xs text-muted-foreground break-all">{relativePath}</p>

          <div className="flex min-h-[300px] items-center justify-center rounded-md border border-border/50 bg-muted/20">
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Lecture du fichier…
              </span>
            ) : error ? (
              <span className="p-4 text-sm text-muted-foreground">{error}</span>
            ) : src ? (
              <img src={src} alt={file?.name || "Aperçu de la brute"} className="max-h-[60vh] w-auto" />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FramePreviewDialog;
