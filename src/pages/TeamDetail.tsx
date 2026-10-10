import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Crown, Copy, Settings, UserMinus, Globe, Pencil,
  FolderOpen, ArrowLeft, Upload, Camera,
} from "lucide-react";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  management_mode: string;
  website: string | null;
  logo_url: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  joined_at: string;
  username?: string;
  email?: string;
}

const TeamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editMode, setEditMode] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchTeam = async () => {
    if (!id) return;
    const { data, error } = await supabase.from("teams").select("*").eq("id", id).single();
    if (error || !data) {
      navigate("/teams");
      return;
    }
    setTeam(data as Team);
    setLoading(false);
  };

  const fetchMembers = async () => {
    if (!id) return;
    const { data: membersData } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", id);
    if (!membersData) return;

    const userIds = membersData.map(m => m.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, email")
      .in("id", userIds);

    const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
    setMembers(membersData.map(m => ({
      ...m,
      username: profileMap.get(m.user_id)?.username,
      email: profileMap.get(m.user_id)?.email,
    })));
  };

  useEffect(() => {
    fetchTeam();
    fetchMembers();
  }, [id]);

  const isAdmin = team
    ? team.management_mode === "collaborative"
      ? members.some(m => m.user_id === user?.id) || team.owner_id === user?.id
      : team.owner_id === user?.id
    : false;

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !team || !user) return;
    const { data, error } = await supabase.from("team_invitations").insert({
      team_id: team.id,
      email: inviteEmail.trim(),
      invited_by: user.id,
    }).select("id, token").single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    const inviteLink = `${window.location.origin}/invite/${data.token}`;
    navigator.clipboard.writeText(inviteLink);

    // Send the invitation link by email
    const { error: sendError } = await supabase.functions.invoke("send-team-invite", {
      body: { invitation_id: data.id },
    });

    if (sendError) {
      console.error("Team invite email failed", sendError);
      toast({
        title: "Lien copié, envoi impossible",
        description: "Le lien d'invitation a été copié dans le presse-papier, mais l'email n'a pas pu être envoyé.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Invitation envoyée !",
        description: `Un email a été envoyé à ${inviteEmail.trim()}. Le lien est aussi copié dans le presse-papier.`,
      });
    }
    setInviteEmail("");
    setInviteDialogOpen(false);
  };

  const openSettings = () => {
    if (!team) return;
    setEditName(team.name);
    setEditWebsite(team.website || "");
    setEditMode(team.management_mode);
    setSettingsDialogOpen(true);
  };

  const updateTeam = async () => {
    if (!team) return;
    const { error } = await supabase.from("teams").update({
      name: editName.trim(),
      website: editWebsite.trim() || null,
      management_mode: editMode,
    }).eq("id", team.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team mise à jour !" });
      setSettingsDialogOpen(false);
      fetchTeam();
    }
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (!team) return;
    if (memberUserId === team.owner_id) {
      toast({ title: "Impossible", description: "Le créateur ne peut pas être retiré.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membre retiré" });
      fetchMembers();
    }
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !team) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const filePath = `${team.id}/logo.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Erreur", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("team-logos").getPublicUrl(filePath);

    const { error: updateError } = await supabase.from("teams")
      .update({ logo_url: urlData.publicUrl })
      .eq("id", team.id);

    if (updateError) {
      toast({ title: "Erreur", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Logo mis à jour !" });
      fetchTeam();
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!team) return null;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground" onClick={() => navigate("/teams")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Retour aux teams
          </Button>

          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="relative group">
              <div className="h-20 w-20 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden">
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              {isAdmin && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-foreground" />
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
                </>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                  {team.management_mode === "collaborative" ? "Collaboratif" : "Admin unique"}
                </span>
              </div>
              {team.website && (
                <a href={team.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                  <Globe className="h-3 w-3" />{team.website}
                </a>
              )}
              <p className="text-sm text-muted-foreground mt-1">{members.length} membre{members.length > 1 ? "s" : ""}</p>
            </div>

            {/* Admin actions */}
            {isAdmin && (
              <div className="flex gap-2">
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Copy className="h-4 w-4 mr-2" />Inviter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inviter dans {team.name}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={inviteMember} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Email de l'invité</Label>
                        <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="collegue@example.com" required />
                      </div>
                      <Button type="submit" className="w-full">Générer le lien d'invitation</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={openSettings}>
                  <Settings className="h-4 w-4 mr-2" />Gérer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects section */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />Projets de la team
            </h2>
            <Card className="border-border/50 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun projet pour le moment</p>
                <p className="text-sm text-muted-foreground mb-4">Les projets de la team apparaîtront ici</p>
                <Button variant="secondary" size="sm" onClick={() => navigate("/projects")}>
                  Créer un projet
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Members sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />Membres ({members.length})
            </h2>
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2 min-w-0">
                      {member.user_id === team.owner_id && (
                        <Crown className="h-3 w-3 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {member.username || member.email || "Utilisateur"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize shrink-0">({member.role})</span>
                    </div>
                    {isAdmin && member.user_id !== team.owner_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeMember(member.id, member.user_id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />Gérer {team.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Site web</Label>
                <Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://mon-club-astro.fr" />
              </div>
              <div className="space-y-2">
                <Label>Mode de gestion</Label>
                <Select value={editMode} onValueChange={setEditMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_admin">Administrateur unique</SelectItem>
                    <SelectItem value="collaborative">Collaboratif</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {editMode === "single_admin"
                    ? "Seul le créateur peut gérer la team."
                    : "Tous les membres peuvent gérer la team."}
                </p>
              </div>
              <Button onClick={updateTeam} className="w-full">
                <Pencil className="h-4 w-4 mr-2" />Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default TeamDetail;
