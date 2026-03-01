import { useState, useEffect } from "react";
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
import { Plus, Users, Crown, Copy, Settings, UserMinus, Globe, Pencil } from "lucide-react";

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

const Teams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMode, setNewTeamMode] = useState("single_admin");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [editName, setEditName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editMode, setEditMode] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setTeams(data as Team[]);
    setLoading(false);
  };

  const fetchMembers = async (teamId: string) => {
    const { data: membersData } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId);
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

  useEffect(() => { fetchTeams(); }, []);

  const isAdmin = (team: Team) => {
    if (team.management_mode === "collaborative") {
      return members.some(m => m.user_id === user?.id) || team.owner_id === user?.id;
    }
    return team.owner_id === user?.id;
  };

  // For display purposes before members are loaded
  const isOwnerOrCollaborative = (team: Team) => {
    return team.owner_id === user?.id || team.management_mode === "collaborative";
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    const { error } = await supabase.from("teams").insert({
      name: newTeamName.trim(),
      owner_id: user.id,
      management_mode: newTeamMode,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team créée !" });
      setNewTeamName("");
      setNewTeamMode("single_admin");
      setDialogOpen(false);
      fetchTeams();
    }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam || !user) return;
    const { data, error } = await supabase.from("team_invitations").insert({
      team_id: selectedTeam.id,
      email: inviteEmail.trim(),
      invited_by: user.id,
    }).select("token").single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const inviteLink = `${window.location.origin}/invite/${data.token}`;
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Invitation créée !", description: "Le lien d'invitation a été copié dans le presse-papier." });
      setInviteEmail("");
      setInviteDialogOpen(false);
    }
  };

  const openSettings = async (team: Team) => {
    setSelectedTeam(team);
    setEditName(team.name);
    setEditWebsite(team.website || "");
    setEditMode(team.management_mode);
    setSettingsDialogOpen(true);
    await fetchMembers(team.id);
  };

  const updateTeam = async () => {
    if (!selectedTeam) return;
    const { error } = await supabase.from("teams").update({
      name: editName.trim(),
      website: editWebsite.trim() || null,
      management_mode: editMode,
    }).eq("id", selectedTeam.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team mise à jour !" });
      setSettingsDialogOpen(false);
      fetchTeams();
    }
  };

  const removeMember = async (memberId: string, memberUserId: string) => {
    if (!selectedTeam) return;
    if (memberUserId === selectedTeam.owner_id) {
      toast({ title: "Impossible", description: "Le créateur ne peut pas être retiré.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membre retiré" });
      fetchMembers(selectedTeam.id);
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground mt-1">Gérez vos équipes d'astrophotographie</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nouvelle Team</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une Team</DialogTitle>
              </DialogHeader>
              <form onSubmit={createTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la team</Label>
                  <Input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Deep Sky Observers" required />
                </div>
                <div className="space-y-2">
                  <Label>Mode de gestion</Label>
                  <Select value={newTeamMode} onValueChange={setNewTeamMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_admin">
                        Administrateur unique (créateur)
                      </SelectItem>
                      <SelectItem value="collaborative">
                        Collaboratif (tous administrateurs)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {newTeamMode === "single_admin"
                      ? "Seul le créateur peut inviter, modifier ou révoquer des membres."
                      : "Tous les membres peuvent gérer la team et ses membres."}
                  </p>
                </div>
                <Button type="submit" className="w-full">Créer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune team pour le moment</p>
              <p className="text-sm text-muted-foreground">Créez votre première team pour commencer à collaborer</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team, i) => (
              <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/50 hover:shadow-glow transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {team.owner_id === user?.id && <Crown className="h-4 w-4 text-primary" />}
                      {team.name}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <span>Créée le {new Date(team.created_at).toLocaleDateString("fr-FR")}</span>
                      <span className="block text-xs">
                        {team.management_mode === "collaborative" ? "Mode collaboratif" : "Admin unique"}
                      </span>
                      {team.website && (
                        <span className="flex items-center gap-1 text-xs">
                          <Globe className="h-3 w-3" />{team.website}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {isOwnerOrCollaborative(team) && (
                      <>
                        <Dialog open={inviteDialogOpen && selectedTeam?.id === team.id} onOpenChange={(open) => { setInviteDialogOpen(open); if (open) setSelectedTeam(team); }}>
                          <DialogTrigger asChild>
                            <Button variant="secondary" size="sm" className="w-full">
                              <Copy className="h-4 w-4 mr-2" />Inviter un membre
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
                        <Button variant="outline" size="sm" className="w-full" onClick={() => openSettings(team)}>
                          <Settings className="h-4 w-4 mr-2" />Gérer la team
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Settings Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />Gérer {selectedTeam?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Team info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Informations</h3>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                <Button size="sm" onClick={updateTeam}>
                  <Pencil className="h-4 w-4 mr-2" />Enregistrer
                </Button>
              </div>

              {/* Members */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Membres ({members.length})
                </h3>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2">
                        {member.user_id === selectedTeam?.owner_id && (
                          <Crown className="h-3 w-3 text-primary" />
                        )}
                        <span className="text-sm font-medium">
                          {member.username || member.email || "Utilisateur"}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">({member.role})</span>
                      </div>
                      {member.user_id !== selectedTeam?.owner_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember(member.id, member.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AppLayout>
  );
};

export default Teams;
