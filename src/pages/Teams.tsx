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
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Crown, Copy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

const Teams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    const { data, error } = await supabase.from("teams").select("*").order("created_at", { ascending: false });
    if (!error && data) setTeams(data);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, []);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !user) return;
    const { error } = await supabase.from("teams").insert({ name: newTeamName.trim(), owner_id: user.id });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team créée !" });
      setNewTeamName("");
      setDialogOpen(false);
      fetchTeams();
    }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedTeam || !user) return;
    const { data, error } = await supabase.from("team_invitations").insert({
      team_id: selectedTeam,
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
                    <CardDescription>Créée le {new Date(team.created_at).toLocaleDateString("fr-FR")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {team.owner_id === user?.id && (
                      <Dialog open={inviteDialogOpen && selectedTeam === team.id} onOpenChange={(open) => { setInviteDialogOpen(open); if (open) setSelectedTeam(team.id); }}>
                        <DialogTrigger asChild>
                          <Button variant="secondary" size="sm" className="w-full">
                            <Copy className="h-4 w-4 mr-2" />
                            Inviter un membre
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
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Teams;
