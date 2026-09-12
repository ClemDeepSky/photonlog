import { createContext, useCallback, useContext, useEffect, useRef, ReactNode } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/contexts/AuthContext";

const storageKey = (userId?: string) => `photonlog-tour-done-${userId ?? "anon"}`;

interface DemoTourContextType {
  startTour: () => void;
}

const DemoTourContext = createContext<DemoTourContextType>({ startTour: () => {} });

export const useDemoTour = () => useContext(DemoTourContext);

export const DemoTourProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const driverRef = useRef<Driver | null>(null);

  const buildDriver = useCallback(
    () =>
      driver({
        showProgress: true,
        allowClose: true,
        nextBtnText: "Suivant",
        prevBtnText: "Précédent",
        doneBtnText: "Terminer",
        progressText: "{{current}} / {{total}}",
        steps: [
          {
            popover: {
              title: "Bienvenue sur Photonlog ✨",
              description:
                "Petite visite de 1 minute pour découvrir comment suivre vos acquisitions. Vous pouvez la quitter à tout moment et la relancer depuis le tableau de bord.",
            },
          },
          {
            element: '[data-tour="nav-teams"]',
            popover: {
              title: "Teams",
              description:
                "Créez une équipe et invitez d'autres astrophotographes pour partager des projets communs. Un projet peut aussi rester personnel.",
            },
          },
          {
            element: '[data-tour="nav-equipment"]',
            popover: {
              title: "Matériel",
              description:
                "Enregistrez vos setups : télescope, caméra, monture, filtres. Ils servent ensuite au cadrage et aux projets.",
            },
          },
          {
            element: '[data-tour="nav-projects"]',
            popover: {
              title: "Projets",
              description:
                "Un projet = une cible. Coordonnées, mosaïque, filtres, temps de pose et quantités visées.",
            },
          },
          {
            element: '[data-tour="nav-frames"]',
            popover: {
              title: "Frames",
              description:
                "Ajoutez vos brutes au fil des nuits, à la main ou en analysant votre dossier local. Les courbes de qualité (FWHM, HFR, excentricité) se remplissent automatiquement.",
            },
          },
          {
            element: '[data-tour="demo-project"]',
            popover: {
              title: "Projet de démonstration",
              description:
                "Chargez un projet d'exemple sur M31 avec des acquisitions déjà saisies pour explorer l'outil sans rien risquer. Vous pourrez le supprimer ensuite.",
            },
          },
          {
            element: '[data-tour="quick-start"]',
            popover: {
              title: "Vos 4 étapes",
              description:
                "Team, matériel, projet, frames. Suivez cet ordre et votre suivi est prêt. Bonnes photons !",
            },
          },
        ],
        onDestroyed: () => {
          if (user) localStorage.setItem(storageKey(user.id), "1");
        },
      }),
    [user]
  );

  const startTour = useCallback(() => {
    driverRef.current?.destroy();
    const d = buildDriver();
    driverRef.current = d;
    d.drive();
  }, [buildDriver]);

  // First visit: launch automatically once the dashboard is rendered.
  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(storageKey(user.id))) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector('[data-tour="quick-start"]')) startTour();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [user, startTour]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  return <DemoTourContext.Provider value={{ startTour }}>{children}</DemoTourContext.Provider>;
};
