import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Telescope, Star, Users, ImagePlus } from "lucide-react";

const Index = () => {
  return <Navigate to="/dashboard" replace />;

  // eslint-disable-next-line no-unreachable
  // Legacy landing preserved below (unused):

  return (
    <div className="min-h-screen bg-cosmic relative overflow-hidden">
      {/* Animated stars */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-foreground animate-twinkle"
          style={{
            width: Math.random() * 3 + 1 + "px",
            height: Math.random() * 3 + 1 + "px",
            top: Math.random() * 100 + "%",
            left: Math.random() * 100 + "%",
            animationDelay: Math.random() * 5 + "s",
            opacity: Math.random() * 0.6 + 0.1,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <Telescope className="h-16 w-16 text-primary mx-auto mb-6 animate-float" />
          <h1 className="text-5xl md:text-7xl font-bold mb-4">
            <span className="text-gradient">AstroTracker</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-8">
            Suivez vos acquisitions d'astrophotographie, collaborez en équipe
            et maîtrisez chaque frame de vos sessions nocturnes.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full"
        >
          {[
            { icon: Users, title: "Teams", desc: "Collaborez avec d'autres astrophotographes" },
            { icon: Star, title: "Projets", desc: "Organisez vos cibles et acquisitions" },
            { icon: ImagePlus, title: "Frames", desc: "Suivez Lights, Darks, Flats & Bias" },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-6 hover:shadow-glow transition-shadow"
            >
              <item.icon className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
