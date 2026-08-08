import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Star, Telescope } from "lucide-react";

const Auth = () => {
  const { session, loading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        emailRedirectTo: window.location.origin,
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
      toast({ title: "Compte créé !", description: "Vérifiez votre email pour confirmer votre inscription." });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      toast({
        title: "Connexion impossible",
        description: msg.includes("invalid login")
          ? "Email ou mot de passe incorrect."
          : msg.includes("not confirmed")
          ? "Email non confirmé. Utilisez « Renvoyer l'email de confirmation »."
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Email requis", description: "Saisissez votre email d'abord.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : { title: "Email envoyé", description: "Consultez votre boîte mail pour réinitialiser le mot de passe." }
    );
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({ title: "Email requis", description: "Saisissez votre email d'abord.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setIsLoading(false);
    toast(
      error
        ? { title: "Erreur", description: error.message, variant: "destructive" }
        : { title: "Email de confirmation renvoyé" }
    );
  };

  return (
    <div className="min-h-screen bg-cosmic flex items-center justify-center p-4 relative overflow-hidden">
      {/* Stars background */}
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
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 m-0 rounded-b-none">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle>Connexion</CardTitle>
                  <CardDescription>Accédez à votre espace d'astrophotographie</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="astro@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                  <div className="flex flex-col gap-1 pt-1">
                    <Button type="button" variant="link" className="h-auto p-0 text-xs justify-start" onClick={handleForgotPassword}>
                      Mot de passe oublié ?
                    </Button>
                    <Button type="button" variant="link" className="h-auto p-0 text-xs justify-start" onClick={handleResendConfirmation}>
                      Renvoyer l'email de confirmation
                    </Button>
                  </div>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle>Créer un compte</CardTitle>
                  <CardDescription>Rejoignez la communauté d'astrophotographes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-username">Nom d'utilisateur</Label>
                    <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="AstroNomade" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="astro@example.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Mot de passe</Label>
                    <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Création..." : "Créer mon compte"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
