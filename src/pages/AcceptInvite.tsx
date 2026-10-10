import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Telescope, CheckCircle, XCircle, Loader2 } from "lucide-react";

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "ready" | "accepted" | "error" | "expired" | "mismatch">("loading");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");

  useEffect(() => {
    const checkInvitation = async () => {
      if (!token) {
        setStatus("error");
        setError("Lien d'invitation invalide.");
        return;
      }

      const { data, error } = await supabase
        .from("team_invitations")
        .select("*, teams(name)")
        .eq("token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (error || !data) {
        setStatus("expired");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus("expired");
        return;
      }

      setTeamName((data as any).teams?.name || "Équipe");
      setInvitedEmail(data.email);
      if (user?.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
        setStatus("mismatch");
        return;
      }
      setStatus("ready");
    };

    checkInvitation();
  }, [token, user?.email]);

  const switchAccount = async () => {
    await signOut();
    navigate(`/auth?redirect=/invite/${token}`);
  };

  const acceptInvitation = async () => {
    if (!user || !token) return;
    setStatus("loading");

    // Get invitation
    const { data: invitation, error: fetchErr } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (fetchErr || !invitation) {
      setStatus("error");
      setError("Invitation introuvable ou déjà utilisée.");
      return;
    }

    // Add user to team
    const { error: memberErr } = await supabase
      .from("team_members")
      .insert({ team_id: invitation.team_id, user_id: user.id, role: "member" });

    if (memberErr) {
      if (memberErr.message.includes("duplicate") || memberErr.code === "23505") {
        toast({ title: "Vous êtes déjà membre de cette équipe." });
        navigate("/teams");
        return;
      }
      setStatus("error");
      setError(memberErr.message);
      return;
    }

    // Mark invitation as accepted
    await supabase
      .from("team_invitations")
      .update({ status: "accepted" })
      .eq("token", token);
    setStatus("accepted");
    toast({ title: "Invitation acceptée !", description: `Vous avez rejoint ${teamName}.` });
    setTimeout(() => navigate("/teams"), 2000);
  };

  if (!session && status !== "loading") {
    return (
      <div className="min-h-screen bg-cosmic flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardHeader className="text-center">
            <Telescope className="h-10 w-10 text-primary mx-auto mb-2" />
            <CardTitle>Invitation à rejoindre {teamName || "une équipe"}</CardTitle>
            <CardDescription>Connectez-vous ou créez un compte pour accepter l'invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate(`/auth?redirect=/invite/${token}`)}>
              Se connecter / S'inscrire
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cosmic flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center">
          <Telescope className="h-10 w-10 text-primary mx-auto mb-2" />
          {status === "loading" && (
            <>
              <CardTitle>Chargement...</CardTitle>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mt-4 text-primary" />
            </>
          )}
          {status === "ready" && (
            <>
              <CardTitle>Rejoindre {teamName}</CardTitle>
              <CardDescription>Vous avez été invité à rejoindre cette équipe d'astrophotographie.</CardDescription>
            </>
          )}
          {status === "accepted" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Bienvenue dans {teamName} !</CardTitle>
              <CardDescription>Redirection en cours...</CardDescription>
            </>
          )}
          {status === "expired" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Invitation expirée</CardTitle>
              <CardDescription>Ce lien d'invitation n'est plus valide ou a déjà été utilisé.</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Erreur</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>
        {status === "ready" && (
          <CardContent>
            <Button className="w-full" onClick={acceptInvitation}>
              Accepter l'invitation
            </Button>
          </CardContent>
        )}
        {(status === "expired" || status === "error") && (
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AcceptInvite;
