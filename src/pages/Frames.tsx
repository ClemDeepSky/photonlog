import AppLayout from "@/components/AppLayout";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlus } from "lucide-react";

const Frames = () => {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Frames</h1>
          <p className="text-muted-foreground mt-1">Suivez vos acquisitions image par image</p>
        </div>

        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ImagePlus className="h-16 w-16 text-muted-foreground mb-4 animate-float" />
            <h2 className="text-xl font-semibold mb-2">Module en construction</h2>
            <p className="text-muted-foreground max-w-md">
              Bientôt vous pourrez ajouter vos frames (Lights, Darks, Flats, Bias),
              suivre le temps total d'exposition et organiser vos données par filtre et session.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
};

export default Frames;
