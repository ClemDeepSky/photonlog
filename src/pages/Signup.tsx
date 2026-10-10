import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Telescope, MailCheck } from "lucide-react";

const Signup = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const redirect = searchParams.get("redirect") || "/dashboard";

  if (loading) return null;
  if (session) return <Navigate to={redirect} replace />;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: "Erreur", description: "Le nom d'utilisateur est requis.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        // Après confirmation de l'email, l'utilisateur revient sur la page visée (ex. l'invitation)
        emailRedirectTo: `${window.location.origin}${redirect}`,
      },
    });
    setIsLoading(false);
    if (error) {
      toast({
        title: "Erreur",
        description: error.message.includes("already registered")
          ? "Un compte existe déjà avec cet email. Connectez-vous."
          : error.message,
        variant: "destructive",
      });
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen bg-cosmic flex items-center justify-center p-4 relative overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-foreground animate-twinkle"
          style={{
            width: Math.random() * 3 + 1 + "px",
            height: Math.random() * 3 + 1 + "px",
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 3 + "s",
            opacity: Math.random() * 0.5 + 0.1,
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <Telescope className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient">Photonlog</h1>
        </div>

        <Card className="border-border/50 shadow-glow">
          {done ? (
            <>
              <CardHeader className="text-center">
                <MailCheck className="h-12 w-12 text-primary mx-auto mb-2" />
                <CardTitle>Vérifiez votre email</CardTitle>
                <CardDescription>
                  Un email de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur le lien qu'il contient
                  pour activer votre compte — vous serez ensuite redirigé automatiquement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" className="w-full" onClick={() => navigate("/auth")}>
                  J'ai déjà confirmé, me connecter
                </Button>
              </CardContent>
            </>
          ) : (
            <form onSubmit={handleSignUp}>
              <CardHeader>
                <CardTitle>Nouveau compte</CardTitle>
                <CardDescription>Créez votre compte Photonlog pour continuer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Nom d'utilisateur</Label>
                  <Input
                    id="reg-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="AstroNomade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="astro@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Mot de passe</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Création..." : "Créer mon compte"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs justify-start"
                  onClick={() => navigate(`/auth?redirect=${encodeURIComponent(redirect)}`)}
                >
                  J'ai déjà un compte
                </Button>
              </CardContent>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;
