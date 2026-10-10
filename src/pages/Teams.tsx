import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Crown, Globe } from "lucide-react";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  management_mode: string;
  website: string | null;
  logo_url: string | null;
}

const Teams = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMode, setNewTeamMode] = useState("single_admin");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    setTeams([]);
    if (!user) { setLoading(false); return; }
    const { data: memberships, error: membershipError } = await supabase
      .from("team_members").select("team_id").eq("user_id", user.id);
    if (membershipError) {
      toast({ title: "Chargement impossible", description: membershipError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const ids = (memberships ?? []).map((row) => row.team_id);
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .or(ids.length ? `owner_id.eq.${user.id},id.in.(${ids.join(",")})` : `owner_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!error && data) setTeams(data as Team[]);
    setLoading(false);
  };

  useEffect(() => { fetchTeams(); }, [user?.id]);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour créer une team.",
        variant: "destructive",
      });
      navigate("/auth?redirect=/teams");
      return;
    }
    const { data, error } = await supabase.from("teams").insert({
      name: newTeamName.trim(),
      owner_id: user.id,
      management_mode: newTeamMode,
    }).select().single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Team créée !" });
      setNewTeamName("");
      setNewTeamMode("single_admin");
      setDialogOpen(false);
      if (data) navigate(`/teams/${data.id}`);
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single_admin">Administrateur unique (créateur)</SelectItem>
                      <SelectItem value="collaborative">Collaboratif (tous administrateurs)</SelectItem>
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
                <Card
                  className="border-border/50 hover:shadow-glow transition-shadow cursor-pointer"
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden shrink-0">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="h-full w-full object-cover" />
                        ) : (
                          <Users className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {team.owner_id === user?.id && <Crown className="h-4 w-4 text-primary shrink-0" />}
                          <span className="truncate">{team.name}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {team.management_mode === "collaborative" ? "Collaboratif" : "Admin unique"}
                          {team.website && (
                            <span className="flex items-center gap-1 mt-0.5">
                              <Globe className="h-3 w-3" />{team.website}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
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
