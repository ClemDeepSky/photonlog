import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  BarChart3,
  Crosshair,
  FolderOpen,
  MapPin,
  Moon,
  Telescope,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardAsset from "@/assets/help/teaser-dashboard.jpg.asset.json";
import framingAsset from "@/assets/help/teaser-framing.jpg.asset.json";
import qualityAsset from "@/assets/help/teaser-quality.jpg.asset.json";
import equipmentAsset from "@/assets/help/teaser-equipment.jpg.asset.json";
import observingSiteAsset from "@/assets/help/observing-site.png.asset.json";
import framesAsset from "@/assets/help/frames.png.asset.json";

type Block = {
  id: string;
  kicker: string;
  title: string;
  text: string;
  points: string[];
  icon: typeof Telescope;
  image: string;
  alt: string;
};

const blocks: Block[] = [
  {
    id: "progression",
    kicker: "Tableau de bord",
    title: "Toutes vos heures, d’un coup d’œil.",
    text: "Intégration acquise, objectif, reste à faire — filtre par filtre.",
    points: ["Temps d’intégration", "Progression par filtre", "Projets actifs"],
    icon: BarChart3,
    image: dashboardAsset.url,
    alt: "Tableau de bord Photonlog avec les heures d’intégration par filtre",
  },
  {
    id: "cadrage",
    kicker: "Projets",
    title: "Cadrez avant la nuit.",
    text: "Cible simple ou mosaïque, import Telescopius, J2000 ou JNow : vos panneaux posés sur le vrai ciel.",
    points: ["Mosaïques", "Import CSV", "19 relevés du ciel"],
    icon: Crosshair,
    image: framingAsset.url,
    alt: "Cadrage d’une mosaïque de deux panneaux sur M31",
  },
  {
    id: "acquisitions",
    kicker: "Acquisitions",
    title: "Votre dossier parle. Photonlog écoute.",
    text: "Pointez le dossier de vos brutes : filtres, poses et panneaux sont reconnus tout seuls.",
    points: ["Détection automatique", "Durées multiples", "Actualisation incrémentale"],
    icon: FolderOpen,
    image: framesAsset.url,
    alt: "Suivi des acquisitions d’un projet",
  },
  {
    id: "qualite",
    kicker: "Qualité",
    title: "Chaque nuit, chaque brute.",
    text: "FWHM, excentricité, étoiles… et la lune juste au-dessus. Sélectionnez, comparez, écartez.",
    points: ["L R V B S H O", "Phase et hauteur de la lune", "Tri des brutes"],
    icon: Moon,
    image: qualityAsset.url,
    alt: "Graphique de qualité des brutes avec conditions par nuit",
  },
  {
    id: "materiel",
    kicker: "Matériel",
    title: "Vos setups, une fois pour toutes.",
    text: "Instrument, caméra, monture, filtres : prêts à être réutilisés sur chaque projet.",
    points: ["Profils réutilisables", "Calcul du champ", "Roue à filtres"],
    icon: Wrench,
    image: equipmentAsset.url,
    alt: "Profils de matériel d’astrophotographie",
  },
  {
    id: "sites",
    kicker: "Sites d’observation",
    title: "Le bon endroit, la bonne nuit.",
    text: "Choisissez une ville : durée de nuit astronomique et lune se calculent pour votre ciel.",
    points: ["Autocomplétion", "Nuit astronomique", "Lever et coucher de lune"],
    icon: MapPin,
    image: observingSiteAsset.url,
    alt: "Création d’un site d’observation",
  },
];

/** Page vitrine publique : présente Photonlog et envoie vers l’outil. */
const Landing = () => {
  const { session, loading } = useAuth();
  const appEntry = session ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen bg-cosmic text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-5 lg:px-10">
          <Link to="/" className="flex items-center gap-2" aria-label="Accueil Photonlog">
            <Telescope className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-gradient">Photonlog</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wider text-primary">
              Beta
            </span>
          </Link>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex" aria-label="Sections">
            {blocks.map((b) => (
              <a key={b.id} href={`#${b.id}`} className="transition-colors hover:text-foreground">
                {b.kicker}
              </a>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link to={appEntry}>
              {session ? "Ouvrir Photonlog" : "Connexion"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="px-5 pb-12 pt-20 text-center lg:px-10 lg:pt-28">
          <p className="mb-4 text-sm font-medium tracking-widest text-primary">ASTROPHOTOGRAPHIE</p>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
            De la cible à la dernière pose.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Planifiez, acquérez, mesurez. Photonlog garde le fil de vos nuits.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={appEntry}>{loading ? "…" : session ? "Ouvrir Photonlog" : "Commencer"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#progression">Découvrir</a>
            </Button>
          </div>
          <figure className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-xl border border-border/70 shadow-glow">
            <img src={qualityAsset.url} alt="Aperçu de Photonlog" className="h-auto w-full" />
          </figure>
        </section>

        <div className="space-y-28 px-5 py-20 lg:px-10">
          {blocks.slice(0, 5).map((b, i) => (
            <section
              key={b.id}
              id={b.id}
              className="mx-auto grid max-w-7xl scroll-mt-24 items-center gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
            >
              <div className={i % 2 ? "lg:order-2" : ""}>
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                  <b.icon className="h-4 w-4" /> {b.kicker}
                </div>
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{b.title}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{b.text}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {b.points.map((p) => (
                    <li key={p} className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-sm text-muted-foreground">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-glow">
                <img src={b.image} alt={b.alt} loading="lazy" className="h-auto w-full" />
              </figure>
            </section>
          ))}

          <section id="sites" className="mx-auto grid max-w-7xl scroll-mt-24 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-card/60 p-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                <MapPin className="h-4 w-4" /> {blocks[5].kicker}
              </div>
              <h2 className="text-2xl font-bold">{blocks[5].title}</h2>
              <p className="mt-3 text-muted-foreground">{blocks[5].text}</p>
              <img src={blocks[5].image} alt={blocks[5].alt} loading="lazy" className="mt-6 w-full rounded-lg border border-border/70" />
            </div>
            <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
                <Users className="h-4 w-4" /> Équipes
              </div>
              <h2 className="text-2xl font-bold">Une cible, plusieurs télescopes.</h2>
              <p className="mt-3 text-muted-foreground">
                Invitez vos amis par lien et additionnez vos heures sur un projet commun.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Chacun déclare son setup, son dossier et son plan par filtre et par panneau.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Le cadrage superpose le champ de chaque participant, à sa couleur.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Progression et qualité du projet entier, filtrables par participant.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Chacun ne modifie que sa contribution — sauf l’administrateur de la team.
                </li>
              </ul>
              <div className="mt-auto pt-10 text-sm text-muted-foreground">
                Vos projets personnels restent les vôtres.{" "}
                <Link to="/confidentialite" className="text-primary hover:underline">
                  Confidentialité
                </Link>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-border/60 px-5 py-24 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Prêt pour la prochaine nuit claire ?</h2>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to={appEntry}>
                {session ? "Ouvrir Photonlog" : "Créer mon compte"} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-5 py-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Photonlog — suivi d’acquisitions astrophoto</span>
          <Link to="/confidentialite" className="hover:text-foreground">
            Confidentialité &amp; cookies
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
