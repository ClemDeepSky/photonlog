import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";

const Equipment = () => {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.1 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Comix', 'Comic Sans MS', 'Chalkboard SE', cursive" }}>Matériel</h1>
          <p className="text-muted-foreground mt-1">Gérez vos profils de matériel d'astrophotographie</p>
        </div>

        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wrench className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
            <h2 className="text-xl font-semibold mb-2">Module en construction</h2>
            <p className="text-muted-foreground max-w-md">
              Bientôt vous pourrez créer et gérer vos profils de matériel :
              télescopes, caméras, montures, filtres, correcteurs…
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};

export default Equipment;
