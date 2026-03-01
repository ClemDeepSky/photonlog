import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

const Projects = () => {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Projets</h1>
          <p className="text-muted-foreground mt-1">Organisez vos projets d'acquisition</p>
        </div>

        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
            <h2 className="text-xl font-semibold mb-2">Module en construction</h2>
            <p className="text-muted-foreground max-w-md">
              Bientôt vous pourrez créer des projets d'acquisition pour vos objets du ciel profond,
              planètes, et bien plus. Associez-les à une team et suivez votre progression.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};

export default Projects;
