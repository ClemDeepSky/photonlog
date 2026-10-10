import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import placeholder from "@/assets/project-placeholder.jpg";

export const PROJECT_PLACEHOLDER = placeholder;

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

const ProjectImageField = ({ value, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      const uid = session.user?.id ?? "anon";
      const ext = file.name.split(".").pop() || "jpg";
      const path = `projects/${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Image importée" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Vignette du projet</Label>
      <div className="flex items-start gap-4">
        <img
          src={value || placeholder}
          alt="Vignette du projet"
          loading="lazy"
          className="h-24 w-40 rounded-md object-cover border border-border"
        />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5 mr-1" />}
              Uploader une image
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <X className="h-3.5 w-3.5 mr-1" /> Retirer
              </Button>
            )}
          </div>
          <Input
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="… ou collez une URL d'image (AstroBin)"
          />
          <p className="text-xs text-muted-foreground">
            Sans image, une vignette d'étoiles générique est utilisée.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
};

export default ProjectImageField;
