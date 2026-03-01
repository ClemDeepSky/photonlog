import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, ImagePlus, Wrench, Star } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const stats = [
  { label: "Teams", value: "—", icon: Users },
  { label: "Projets", value: "—", icon: FolderOpen },
  { label: "Frames", value: "—", icon: ImagePlus },
  { label: "Équipements", value: "—", icon: Wrench },
];

const Dashboard = () => {
  const { user } = useAuth();
  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "Astronome";

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Bienvenue, <span className="text-gradient">{username}</span> ✨
          </h1>
          <p className="text-muted-foreground mt-1">Votre espace d'astrophotographie</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border/50 hover:shadow-glow transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mt-8">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Démarrage rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2">
              <p>1. Créez ou rejoignez une <strong className="text-foreground">Team</strong></p>
              <p>2. Configurez votre <strong className="text-foreground">Matériel</strong> (télescope, caméra, filtres…)</p>
              <p>3. Créez un <strong className="text-foreground">Projet</strong> d'acquisition</p>
              <p>4. Ajoutez vos <strong className="text-foreground">Frames</strong> au fur et à mesure</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;
