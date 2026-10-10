import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

export default function DeleteDemoButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("projects").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Vous ne pouvez supprimer que votre propre projet démo.");
    },
    onSuccess: () => {
      setOpen(false);
      client.invalidateQueries();
      toast({ title: "Projet démo supprimé" });
    },
    onError: (error: Error) => toast({ title: "Suppression impossible", description: error.message, variant: "destructive" }),
  });
  return <>
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" aria-label={`Supprimer le projet ${name}`} onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /></Button>
    <AlertDialog open={open} onOpenChange={(value) => { if (!mutation.isPending) setOpen(value); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer votre projet démo ?</AlertDialogTitle>
          <AlertDialogDescription>Le projet « {name} » et ses acquisitions de démonstration seront définitivement supprimés. Vos fichiers locaux ne seront pas touchés.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={(event) => { event.preventDefault(); mutation.mutate(); }}>{mutation.isPending ? "Suppression…" : "Supprimer définitivement"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}