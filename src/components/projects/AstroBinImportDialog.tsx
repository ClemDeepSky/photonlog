import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { parseAstroBin, type AstroBinImport } from "@/lib/astrobin";
import { toast } from "@/hooks/use-toast";

interface Props {
  onImport: (result: AstroBinImport) => void;
  trigger?: React.ReactNode;
}

const PLACEHOLDER = `Rosette Nebula - Caldwell 49 - SHOrvb - 32h

par Clément Ver Eecke

Publié: Apr 12, 2026

Intégration totale: 32h 15m

Intégration par filtre:

- R: 40m (40 × 60")
- Hα: 13h 5m (157 × 300")`;

const AstroBinImportDialog = ({ onImport, trigger }: Props) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const preview = text.trim() ? parseAstroBin(text) : null;

  const handleImport = () => {
    if (!preview || preview.filters.length === 0) {
      toast({ title: "Aucune donnée exploitable", description: "Collez le texte exporté depuis AstroBin.", variant: "destructive" });
      return;
    }
    onImport(preview);
    setOpen(false);
    setText("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Download className="h-3 w-3 mr-1" /> Importer depuis AstroBin
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import AstroBin</DialogTitle>
          <DialogDescription>
            Collez le texte exporté depuis AstroBin. Le nom du projet et les acquisitions par filtre seront remplis automatiquement (l'équipement est ignoré).
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          className="min-h-[220px] font-mono text-xs"
        />

        {preview && (
          <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <div><span className="text-muted-foreground">Titre : </span>{preview.title || "—"}</div>
            {preview.author && <div><span className="text-muted-foreground">Auteur : </span>{preview.author}</div>}
            {preview.totalIntegration && <div><span className="text-muted-foreground">Intégration : </span>{preview.totalIntegration}</div>}
            <div className="flex flex-wrap gap-2 pt-1">
              {preview.filters.length === 0 ? (
                <span className="text-xs text-muted-foreground">Aucun filtre détecté</span>
              ) : (
                preview.filters.map((f, i) => (
                  <Badge key={i} variant="secondary">{f.filter} · {f.count} × {f.exposure}s</Badge>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleImport} disabled={!preview || preview.filters.length === 0}>Importer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AstroBinImportDialog;
