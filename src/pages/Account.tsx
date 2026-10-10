import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Camera, Trash2, Loader2 } from "lucide-react";

const csvCell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsvSection = (name: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return `# ${name}\n(aucune donnée)\n`;
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  return [`# ${name}`, cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
};

const Account = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const loadAvatar = async (path: string | null) => {
    if (!path) return setAvatarUrl(null);
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl ?? null);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle().then(({ data }) => {
      setUsername(data?.username ?? "");
      loadAvatar(data?.avatar_url ?? null);
    });
  }, [user]);

  if (!user) return null;

  const saveUsername = async () => {
    const v = username.trim();
    if (v.length < 2 || v.length > 50) return toast.error("Le nom doit contenir entre 2 et 50 caractères.");
    setBusy("name");
    const { error } = await supabase.from("profiles").update({ username: v }).eq("id", user.id);
    setBusy(null);
    error ? toast.error(error.message) : toast.success("Nom d'utilisateur mis à jour.");
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Choisissez une image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image trop lourde (5 Mo max).");
    setBusy("avatar");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { data: old } = await supabase.storage.from("avatars").list(user.id);
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (!error) {
      await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (old?.length) await supabase.storage.from("avatars").remove(old.map((f) => `${user.id}/${f.name}`));
      await loadAvatar(path);
      toast.success("Photo de profil mise à jour.");
    } else toast.error(error.message);
    setBusy(null);
  };

  const changeEmail = async () => {
    const v = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast.error("Adresse email invalide.");
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: v }, { emailRedirectTo: `${window.location.origin}/account` });
    setBusy(null);
    if (error) return toast.error(error.message);
    setNewEmail("");
    toast.success("Un lien de confirmation a été envoyé. Le changement sera effectif après validation.");
  };

  const changePassword = async () => {
    if (pwd.length < 8) return toast.error("Le mot de passe doit contenir au moins 8 caractères.");
    if (pwd !== pwd2) return toast.error("Les mots de passe ne correspondent pas.");
    setBusy("pwd");
    const { error } = await supabase.auth.updateUser({ password: pwd, current_password: currentPwd } as never);
    setBusy(null);
    if (error) return toast.error(error.message);
    setPwd(""); setPwd2(""); setCurrentPwd("");
    toast.success("Mot de passe modifié.");
  };

  const exportCsv = async () => {
    setBusy("export");
    try {
      const uid = user.id;
      const q = async (name: string, p: PromiseLike<{ data: unknown }>) => [name, ((await p).data as Record<string, unknown>[]) ?? []] as const;
      const { data: projects } = await supabase.from("projects").select("*").eq("created_by", uid);
      const { data: contribs } = await supabase.from("project_contributions").select("*").eq("user_id", uid);
      const projectIds = (projects ?? []).map((p) => p.id);
      const contribIds = (contribs ?? []).map((c) => c.id);
      const orFilter = [
        projectIds.length ? `project_id.in.(${projectIds.join(",")})` : null,
        contribIds.length ? `contribution_id.in.(${contribIds.join(",")})` : null,
      ].filter(Boolean).join(",");
      const sections = await Promise.all([
        q("Profil", supabase.from("profiles").select("*").eq("id", uid)),
        q("Matériel", supabase.from("equipment_profiles").select("*").eq("user_id", uid)),
        q("Sites d'observation", supabase.from("observing_sites").select("*").eq("user_id", uid)),
        q("Équipes (membre)", supabase.from("team_members").select("*, teams(name)").eq("user_id", uid)),
        Promise.resolve(["Projets", projects ?? []] as const),
        Promise.resolve(["Contributions", contribs ?? []] as const),
        ...(orFilter
          ? [
              q("Plans d'acquisition", supabase.from("project_acquisitions").select("*").or(orFilter)),
              q("Panneaux", supabase.from("project_panes").select("*").or(orFilter)),
              q("Sessions", supabase.from("project_sessions").select("*").or(orFilter)),
              q("Brutes indexées", supabase.from("project_frames").select("*").or(orFilter).limit(50000)),
            ]
          : []),
      ]);
      const csv = "\uFEFF" + sections.map(([n, r]) => toCsvSection(n, r as Record<string, unknown>[])).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `photonlog-mes-donnees-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error("Export impossible.");
    }
    setBusy(null);
  };

  const deleteAccount = async () => {
    setBusy("delete");
    const { data, error } = await supabase.functions.invoke("delete-account");
    if (error || data?.error) {
      setBusy(null);
      return toast.error("Suppression impossible : " + (data?.error ?? error?.message));
    }
    await signOut();
    toast.success("Votre compte et vos données ont été supprimés.");
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">Mon compte</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Profil</CardTitle><CardDescription>Photo et nom affichés aux membres de vos équipes.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="Photo de profil" className="object-cover" />}
                <AvatarFallback className="text-xl">{(username || user.email || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy === "avatar"}>
                {busy === "avatar" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                Changer la photo
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Nom d'utilisateur</Label>
              <div className="flex gap-2">
                <Input id="username" value={username} maxLength={50} onChange={(e) => setUsername(e.target.value)} />
                <Button onClick={saveUsername} disabled={busy === "name"}>Enregistrer</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Adresse email</CardTitle><CardDescription>Un lien de confirmation sera envoyé à la nouvelle adresse.</CardDescription></CardHeader>
          <CardContent className="flex gap-2">
            <Input type="email" placeholder="nouvelle@adresse.fr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Button onClick={changeEmail} disabled={busy === "email" || !newEmail}>Changer</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mot de passe</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Mot de passe actuel</Label><Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} /></div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
              <div className="space-y-2"><Label>Confirmer</Label><Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
            </div>
            <Button onClick={changePassword} disabled={busy === "pwd" || !pwd || !currentPwd}>Modifier le mot de passe</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mes données</CardTitle><CardDescription>Téléchargez toutes vos données (profil, matériel, sites, projets, plans, sessions, brutes indexées) dans un fichier CSV.</CardDescription></CardHeader>
          <CardContent>
            <Button variant="outline" onClick={exportCsv} disabled={busy === "export"}>
              {busy === "export" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exporter en CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-destructive">Supprimer mon compte</CardTitle>
            <CardDescription>Supprime définitivement votre compte, vos projets personnels, les équipes dont vous êtes propriétaire (avec leurs projets), vos contributions, votre matériel et vos sites. Vos fichiers locaux ne sont jamais touchés.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog onOpenChange={() => setConfirmText("")}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Supprimer mon compte</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                  <AlertDialogDescription>Cette action est irréversible. Pensez à exporter vos données avant. Tapez SUPPRIMER pour confirmer.</AlertDialogDescription>
                </AlertDialogHeader>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" />
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction disabled={confirmText !== "SUPPRIMER" || busy === "delete"} onClick={(e) => { e.preventDefault(); deleteAccount(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {busy === "delete" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Account;
