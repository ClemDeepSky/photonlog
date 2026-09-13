import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  FolderOpen,
  Gauge,
  ImagePlus,
  LineChart,
  LockKeyhole,
  Menu,
  MousePointerClick,
  RefreshCw,
  Shield,
  Telescope,
  Users,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dashboardAsset from "@/assets/help/dashboard.png.asset.json";
import projectsAsset from "@/assets/help/projects.png.asset.json";
import equipmentAsset from "@/assets/help/equipment.png.asset.json";
import framesAsset from "@/assets/help/frames.png.asset.json";
import projectConfigAsset from "@/assets/help/project-config.png.asset.json";

const sections = [
  { id: "objectif", label: "Objectif" },
  { id: "demarrage", label: "Bien démarrer" },
  { id: "tableau-de-bord", label: "Tableau de bord" },
  { id: "equipes", label: "Équipes" },
  { id: "materiel", label: "Matériel" },
  { id: "projets", label: "Projets" },
  { id: "frames", label: "Frames" },
  { id: "qualite", label: "Qualité des brutes" },
  { id: "compte", label: "Compte et confidentialité" },
] as const;

const GuideFigure = ({ src, alt, caption }: { src: string; alt: string; caption: string }) => (
  <figure className="mt-8 overflow-hidden rounded-lg border border-border/70 bg-card shadow-glow">
    <a href={src} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
      <img src={src} alt={alt} loading="lazy" className="h-auto w-full" />
    </a>
    <figcaption className="border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
      {caption} Cliquez sur l’image pour l’agrandir.
    </figcaption>
  </figure>
);

const Feature = ({ icon: Icon, title, children }: { icon: typeof Telescope; title: string; children: React.ReactNode }) => (
  <div className="flex gap-4 border-t border-border/60 py-5 first:border-t-0">
    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <h3 className="font-medium text-foreground">{title}</h3>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  </div>
);

const Guide = () => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Guide d’utilisation | Photonlog";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-cosmic text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2" aria-label="Accueil Photonlog">
            <Telescope className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-gradient">Photonlog</span>
            <span className="hidden text-sm text-muted-foreground sm:inline">Guide d’utilisation</span>
          </Link>
          <Button asChild size="sm">
            <Link to="/dashboard">
              Ouvrir Photonlog
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="border-b border-border/60">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
            <div className="max-w-4xl">
              <p className="mb-4 text-sm font-medium text-primary">DOCUMENTATION PHOTONLOG</p>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Pilotez vos acquisitions, de la cible à la dernière pose
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Photonlog centralise vos projets d’astrophotographie, vos setups, vos équipes et le suivi de chaque
                série d’images. Ce guide présente les écrans et les principales actions dans l’ordre d’utilisation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <a href="#demarrage">Commencer le guide</a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Accéder à mon espace</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-16">
          <aside className="hidden lg:block">
            <nav className="sticky top-24" aria-label="Sommaire du guide">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Menu className="h-3.5 w-3.5" /> SOMMAIRE
              </p>
              <ul className="space-y-1 border-l border-border/70">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block border-l border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0 space-y-20">
            <section id="objectif" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">01 — OBJECTIF</p>
              <h2 className="mt-2 text-3xl font-bold">Un carnet de bord pour l’astrophotographie</h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
                Photonlog permet de préparer un objectif d’acquisition, de compter les poses réalisées et de mesurer
                l’avancement réel. Les informations restent organisées par projet, filtre et panneau de mosaïque pour
                que vous sachiez immédiatement ce qui est terminé et ce qu’il reste à capturer.
              </p>
              <div className="mt-8 grid gap-x-8 md:grid-cols-2">
                <Feature icon={Gauge} title="Planifier et suivre">
                  Définissez le nombre de poses, leur durée, le binning et les filtres, puis suivez la progression et le
                  temps d’intégration.
                </Feature>
                <Feature icon={Wrench} title="Réutiliser votre matériel">
                  Enregistrez vos configurations optiques une fois et rattachez-les à vos différents projets.
                </Feature>
                <Feature icon={Users} title="Travailler seul ou en équipe">
                  Gardez un projet personnel ou partagez sa gestion avec les membres d’une team.
                </Feature>
                <Feature icon={LineChart} title="Contrôler la qualité">
                  Exploitez les mesures présentes dans les noms de fichiers pour visualiser l’évolution d’une nuit.
                </Feature>
              </div>
            </section>

            <section id="demarrage" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">02 — BIEN DÉMARRER</p>
              <h2 className="mt-2 text-3xl font-bold">Le parcours recommandé</h2>
              <ol className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  ["1", "Compte ou team", "Connectez-vous, puis créez une team si le projet doit être partagé."],
                  ["2", "Profil matériel", "Renseignez le setup qui sera utilisé pour cadrer et réaliser les poses."],
                  ["3", "Projet d’acquisition", "Choisissez la cible, les coordonnées, les filtres et les objectifs."],
                  ["4", "Suivi des frames", "Mettez à jour les poses manuellement ou à partir du dossier du projet."],
                ].map(([number, title, text]) => (
                  <li key={number} className="border-t border-border/70 py-5">
                    <div className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {number}
                      </span>
                      <div>
                        <h3 className="font-medium">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                Le tableau de bord propose aussi un projet de démonstration M31 et une visite guidée relançable à tout moment.
              </p>
            </section>

            <section id="tableau-de-bord" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">03 — TABLEAU DE BORD</p>
              <h2 className="mt-2 text-3xl font-bold">La synthèse de votre activité</h2>
              <div className="mt-6">
                <Feature icon={BarChart3} title="Indicateurs globaux">
                  Consultez le nombre de frames acquises, l’intégration réalisée, l’objectif total, le temps restant et
                  la durée moyenne d’une pose.
                </Feature>
                <Feature icon={Gauge} title="Avancement par filtre et par projet">
                  Les barres de progression comparent les poses acquises à l’objectif prévu. Chaque projet donne accès
                  directement à la saisie de ses acquisitions.
                </Feature>
                <Feature icon={MousePointerClick} title="Démarrage rapide">
                  Chargez un projet de démonstration ou relancez les bulles de visite pour revoir l’ordre des étapes.
                </Feature>
              </div>
              <GuideFigure
                src={dashboardAsset.url}
                alt="Tableau de bord Photonlog avec statistiques d’acquisition et démarrage rapide"
                caption="Le tableau de bord rassemble les indicateurs importants et les projets en cours."
              />
            </section>

            <section id="equipes" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">04 — ÉQUIPES</p>
              <h2 className="mt-2 text-3xl font-bold">Partager un projet d’acquisition</h2>
              <div className="mt-6">
                <Feature icon={Users} title="Créer une team">
                  Donnez-lui un nom, un logo et, si besoin, l’adresse de son site. Les projets de team deviennent
                  accessibles à ses membres.
                </Feature>
                <Feature icon={Shield} title="Choisir le mode de gestion">
                  En mode administrateur unique, seul le créateur gère la team. En mode collaboratif, chaque membre peut
                  administrer l’équipe et ses invitations.
                </Feature>
                <Feature icon={ArrowRight} title="Inviter des membres">
                  Générez une invitation et partagez le lien. Après connexion ou création de compte, la personne rejoint
                  directement la team concernée.
                </Feature>
              </div>
            </section>

            <section id="materiel" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">05 — MATÉRIEL</p>
              <h2 className="mt-2 text-3xl font-bold">Des setups prêts à être réutilisés</h2>
              <div className="mt-6">
                <Feature icon={Telescope} title="Chaîne optique complète">
                  Enregistrez télescope, diamètre, focale, caméra, taille des pixels, monture, guidage, correcteur et rotateur.
                </Feature>
                <Feature icon={Camera} title="Catalogues assistés">
                  Les listes de télescopes et de caméras préremplissent leurs caractéristiques. Une saisie libre reste
                  disponible pour un modèle absent.
                </Feature>
                <Feature icon={Wrench} title="Filtres et environnement">
                  Ajoutez les filtres disponibles ainsi que le système et le logiciel d’acquisition. Le setup peut ensuite
                  être sélectionné dans un projet.
                </Feature>
              </div>
              <GuideFigure
                src={equipmentAsset.url}
                alt="Page Matériel de Photonlog présentant plusieurs profils de setup"
                caption="Chaque fiche regroupe le train optique, la monture, le logiciel et les filtres disponibles."
              />
            </section>

            <section id="projets" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">06 — PROJETS</p>
              <h2 className="mt-2 text-3xl font-bold">Préparer une cible et son plan de poses</h2>
              <div className="mt-6">
                <Feature icon={FolderOpen} title="Informations générales">
                  Nommez le projet, ajoutez une illustration et une description, choisissez son setup et décidez s’il est
                  personnel ou rattaché à une team.
                </Feature>
                <Feature icon={Telescope} title="Cadrage céleste">
                  Saisissez l’ascension droite, la déclinaison et l’angle. La carte du ciel affiche le champ couvert par le
                  setup et les panneaux d’une éventuelle mosaïque.
                </Feature>
                <Feature icon={Camera} title="Plan d’acquisition">
                  Activez les filtres nécessaires puis indiquez, par filtre et par panneau, la durée unitaire, la quantité
                  visée et le binning. Un fichier Telescopius peut accélérer la création du cadrage.
                </Feature>
              </div>
              <GuideFigure
                src={projectsAsset.url}
                alt="Liste de projets Photonlog avec vignettes et progression"
                caption="La liste des projets montre leur état, leur progression, leur temps d’intégration et leur type."
              />
              <div className="mt-10 border-l-2 border-primary pl-5">
                <h3 className="font-medium">Dossier racine et structure des noms</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Dans la modification du projet, l’icône dossier sert à désigner une fois le dossier racine. Photonlog
                  mémorise cet accès local sans importer vos fichiers. Le modèle de nommage est facultatif : lorsqu’il est
                  renseigné, Photonlog peut extraire filtre, date, heure, FWHM, excentricité, HFR, étoiles et température.
                </p>
              </div>
              <GuideFigure
                src={projectConfigAsset.url}
                alt="Configuration d’un projet Photonlog avec dossier racine et structure des noms de fichiers"
                caption="Le dossier racine et le modèle de nommage relient la configuration du projet au suivi automatique."
              />
            </section>

            <section id="frames" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">07 — FRAMES</p>
              <h2 className="mt-2 text-3xl font-bold">Mettre à jour les acquisitions réalisées</h2>
              <div className="mt-6">
                <Feature icon={ImagePlus} title="Saisie manuelle">
                  Pour chaque filtre, utilisez les boutons moins et plus ou saisissez directement le nombre de poses
                  acquises. Les pourcentages et temps d’exposition sont recalculés automatiquement.
                </Feature>
                <Feature icon={RefreshCw} title="Actualisation depuis le dossier">
                  Le bouton « Actualiser les acquisitions » relit le dossier racine mémorisé, ajoute les nouvelles images,
                  met à jour les images existantes et retire de l’index celles qui ont disparu. Un même chemin n’est jamais
                  compté deux fois.
                </Feature>
                <Feature icon={LockKeyhole} title="Fichiers conservés localement">
                  L’indexation utilise les noms et chemins relatifs. Les fichiers d’origine restent sur votre ordinateur et
                  ne sont pas envoyés dans votre compte.
                </Feature>
              </div>
            </section>

            <section id="qualite" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">08 — QUALITÉ DES BRUTES</p>
              <h2 className="mt-2 text-3xl font-bold">Lire l’évolution d’une session</h2>
              <div className="mt-6">
                <Feature icon={LineChart} title="Mesures disponibles">
                  Activez une ou plusieurs courbes : FWHM, excentricité, HFR, nombre d’étoiles et température du capteur.
                  Les valeurs absentes sont simplement ignorées.
                </Feature>
                <Feature icon={ChevronRight} title="Filtres, panneaux et nuits">
                  Choisissez le filtre à examiner et, pour une mosaïque, les panneaux visibles. Les images sont ordonnées
                  par date puis heure. Cliquez sur la date d’une nuit pour cadrer automatiquement cette période.
                </Feature>
                <Feature icon={MousePointerClick} title="Zoom et contrôle d’une image">
                  Utilisez la molette ou la barre d’aperçu pour zoomer dans la chronologie. Un point donne accès au nom de
                  l’image et aux mesures extraites.
                </Feature>
              </div>
              <GuideFigure
                src={framesAsset.url}
                alt="Page Frames Photonlog avec progression et graphique de qualité des brutes"
                caption="La page Frames réunit l’actualisation, les compteurs et les courbes chronologiques de qualité."
              />
            </section>

            <section id="compte" className="scroll-mt-24">
              <p className="text-sm font-medium text-primary">09 — COMPTE ET CONFIDENTIALITÉ</p>
              <h2 className="mt-2 text-3xl font-bold">Vos accès et vos données</h2>
              <div className="mt-6">
                <Feature icon={CircleUserRound} title="Compte personnel">
                  La connexion protège vos projets, vos setups et vos teams. La récupération de mot de passe est disponible
                  depuis l’écran de connexion.
                </Feature>
                <Feature icon={LockKeyhole} title="Confidentialité et cookies">
                  La page « Confidentialité & cookies » détaille les données utilisées et permet de gérer les préférences
                  de mesure d’audience. Les cookies indispensables à la connexion restent actifs.
                </Feature>
                <Feature icon={Shield} title="Administration réservée">
                  Le module Administration n’apparaît que pour les comptes autorisés. Il présente une vue globale des
                  utilisateurs et de leurs projets, sans modifier les rubriques courantes.
                </Feature>
              </div>
            </section>

            <section className="border-t border-border/70 pt-12 text-center">
              <Telescope className="mx-auto h-8 w-8 text-primary" />
              <h2 className="mt-4 text-2xl font-bold">Prêt à suivre votre prochaine nuit ?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Commencez par créer votre setup, puis préparez un projet. Le projet de démonstration reste disponible si
                vous souhaitez explorer Photonlog avant de saisir vos propres données.
              </p>
              <Button asChild className="mt-6">
                <Link to="/dashboard">Ouvrir mon tableau de bord</Link>
              </Button>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>Photonlog — Guide d’utilisation</span>
          <div className="flex gap-5">
            <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
            <Link to="/" className="hover:text-foreground">Accueil</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Guide;