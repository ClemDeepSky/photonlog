import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Crosshair, FolderOpen, MapPin, MousePointer2, Users, Wrench, BarChart3 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import equipmentAsset from "@/assets/help/equipment.png.asset.json";
import siteAsset from "@/assets/help/observing-site.png.asset.json";
import framingAsset from "@/assets/help/teaser-framing.jpg.asset.json";
import framesAsset from "@/assets/help/frames.png.asset.json";
import qualityAsset from "@/assets/help/teaser-quality.jpg.asset.json";

const chapters = [
  { id: "setup", label: "Créer son setup", icon: Wrench },
  { id: "site", label: "Créer son site", icon: MapPin },
  { id: "projet", label: "Créer son projet", icon: Crosshair },
  { id: "modes", label: "Intelligent ou manuel", icon: FolderOpen },
  { id: "teams", label: "Travailler en équipe", icon: Users },
  { id: "progression", label: "Suivre les acquisitions", icon: BarChart3 },
  { id: "qualite", label: "Lire la qualité", icon: BookOpen },
  { id: "preselection", label: "Présélectionner les brutes", icon: MousePointer2 },
];

const Steps = ({ items }: { items: ReactNode[] }) => (
  <ol className="mt-6 space-y-4">
    {items.map((item, i) => <li key={i} className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/30 text-xs font-medium text-primary">{i + 1}</span>
      <div className="min-w-0 pt-0.5 leading-relaxed text-muted-foreground">{item}</div>
    </li>)}
  </ol>
);

const Figure = ({ src, alt, caption, width = 1280, height = 800 }: { src: string; alt: string; caption: string; width?: number; height?: number }) => (
  <figure className="mt-8">
    <img src={src} alt={alt} width={width} height={height} loading="lazy" className="h-auto w-full rounded-lg border border-border" />
    <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">{caption}</figcaption>
  </figure>
);

const Note = ({ children }: { children: ReactNode }) => (
  <div className="mt-6 border-l-2 border-primary/50 pl-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
);

const Chapter = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-28 border-t border-border/70 py-12 first:border-t-0 first:pt-0">
    <p className="mb-3 text-xs font-medium uppercase text-primary">{String(chapters.findIndex((c) => c.id === id) + 1).padStart(2, "0")} / Guide Photonlog</p>
    <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{title}</h2>
    {children}
  </section>
);

const Guide = () => {
  const { session } = useAuth();
  const { hash } = useLocation();
  const appEntry = session ? "/dashboard" : "/auth";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Guide d’utilisation — Photonlog";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader>
          
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/"><ArrowLeft /> Accueil</Link></Button>
            <Button asChild size="sm"><Link to={appEntry} aria-label={session ? "Ouvrir Photonlog" : "Connexion"}><span className="hidden sm:inline">{session ? "Ouvrir Photonlog" : "Connexion"}</span><ArrowRight /></Link></Button>
          </div>
      </AppHeader>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-12 lg:px-10">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-medium text-primary">DE LA PRÉPARATION AU TRI</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Guide d’utilisation</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Votre matériel, votre ciel, votre cible. Préparez votre projet, comptez vos acquisitions et choisissez les brutes à conserver — seul ou en équipe.</p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="Sommaire du guide" className="border-y border-border py-5 lg:sticky lg:top-28 lg:border-y-0 lg:border-r lg:pr-5">
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Sommaire</p>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {chapters.map((c) => <Button key={c.id} asChild variant="ghost" className={`h-auto justify-start whitespace-normal px-2 py-2.5 text-left ${hash === `#${c.id}` ? "bg-secondary text-primary" : "text-muted-foreground"}`}>
                <Link to={`/guide#${c.id}`} aria-current={hash === `#${c.id}` ? "location" : undefined}><c.icon />{c.label}</Link>
              </Button>)}
            </div>
          </nav>

          <div className="min-w-0 [&_strong]:font-medium [&_strong]:text-foreground">
            <Chapter id="setup" title="Créer son setup">
              <p className="leading-relaxed text-muted-foreground">Un setup rassemble l’équipement que vous utilisez ensemble. Vous le préparez une fois, puis le réutilisez sur vos projets.</p>
              <Steps items={[
                <>Ouvrez <strong>Matériel et observatoires</strong>, puis cliquez sur <strong>Ajouter un matériel</strong>. Donnez-lui un nom reconnaissable.</>,
                <>Choisissez votre <strong>Optique</strong> et votre <strong>Imageur</strong> dans les catalogues. Si votre modèle n’y figure pas, choisissez <strong>Autre…</strong> et saisissez ses caractéristiques.</>,
                <>Vérifiez la <strong>focale</strong>, la <strong>taille des pixels</strong> et la <strong>résolution du capteur</strong> : ces informations déterminent le champ affiché dans le cadrage. Complétez la monture et le guidage si nécessaire.</>,
                <>Cochez vos <strong>Filtres</strong>, puis cliquez sur <strong>Enregistrer</strong>. Ce setup sera disponible dans la configuration de vos projets.</>,
              ]} />
              <Figure src={equipmentAsset.url} alt="Liste de setups dans Photonlog" caption="Vos profils de matériel sont réutilisables d’un projet à l’autre." />
            </Chapter>

            <Chapter id="site" title="Créer son site d’observation">
              <p className="leading-relaxed text-muted-foreground">Le site situe vos acquisitions sur Terre : il permet de calculer la durée de nuit astronomique et les conditions lunaires pour votre ciel.</p>
              <Steps items={[
                <>Dans <strong>Matériel et observatoires</strong>, repérez <strong>Sites d’observation</strong> et cliquez sur <strong>Ajouter un site d’observation</strong>.</>,
                <>Renseignez le <strong>Nom du site</strong>, choisissez le <strong>Pays</strong> et recherchez une <strong>Ville à proximité</strong>. Sélectionnez une proposition pour préremplir les coordonnées et le fuseau.</>,
                <>Ajustez la <strong>Latitude</strong> et la <strong>Longitude</strong> en degrés décimaux pour votre lieu exact ; vérifiez aussi l’altitude et le fuseau, puis <strong>Enregistrer</strong>.</>,
                <>Choisissez ce <strong>Site d’observation</strong> dans votre projet. En équipe, chaque membre choisit le sien.</>,
              ]} />
              <Figure src={siteAsset.url} width={576} height={412} alt="Formulaire de création d’un site d’observation" caption="Une ville proche donne un point de départ ; vos coordonnées GPS rendent le calcul plus précis." />
              <Note>Dans Acquisitions, ouvrez <strong>Conditions par nuit</strong> sous le graphique : durée de nuit astronomique, phase de la lune, lever et coucher, et position lunaire selon les données disponibles.</Note>
            </Chapter>

            <Chapter id="projet" title="Créer son projet et son plan">
              <Steps items={[
                <>Dans <strong>Projets</strong>, cliquez sur <strong>Ajouter un projet</strong>. Choisissez un projet personnel ou une team, puis renseignez le <strong>Nom du projet</strong>.</>,
                <>Choisissez votre <strong>Setup</strong> et votre <strong>Site d’observation</strong>. Pour un suivi automatique, indiquez votre dossier d’acquisitions. Le dossier devra ensuite être autorisé lors de l’actualisation.</>,
                <>Dans <strong>Coordonnées</strong>, saisissez RA, DEC et l’angle, ou utilisez <strong>Import CSV</strong> avec un export Telescopius. Vérifiez l’époque <strong>J2000 / JNow</strong> utilisée par vos coordonnées.</>,
                <>Pour une mosaïque, définissez vos panneaux. Le <strong>Cadrage</strong> utilise le setup choisi plus haut : vérifiez que les champs couvrent votre cible. Le relevé du ciel et la luminosité se règlent au-dessus de la carte.</>,
                <>Dans <strong>Acquisitions</strong>, définissez chaque objectif : filtre, durée de pose, quantité et binning. Vous pouvez prévoir plusieurs durées pour un même filtre et adapter les lignes par panneau.</>,
                <>Cliquez sur <strong>Créer le projet</strong>. Pour choisir ou changer le suivi, ouvrez ensuite la modification du projet, réglez <strong>Mode intelligent</strong> et cliquez sur <strong>Enregistrer les modifications</strong>.</>,
              ]} />
              <Figure src={framingAsset.url} width={1660} height={1150} alt="Cadrage de panneaux d’une mosaïque sur le ciel" caption="Une cible simple ou plusieurs panneaux : le champ dépend de votre optique et de votre capteur." />
              <Note>La saisie manuelle des coordonnées n’est pas le mode manuel d’acquisition : vous pouvez saisir vos coordonnées à la main et compter vos brutes automatiquement. Dans le cadrage, réglez la position et l’angle avec les champs ; Ctrl + molette permet de zoomer.</Note>
            </Chapter>

            <Chapter id="modes" title="Mode intelligent ou mode manuel">
              <p className="leading-relaxed text-muted-foreground">Le choix se fait dans la configuration du projet avec l’interrupteur <strong>Mode intelligent</strong>. En équipe, il appartient à chaque participant : les deux modes peuvent coexister sur le même projet.</p>
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="text-xl font-medium">Intelligent — depuis vos fichiers</h3>
                  <Steps items={[
                    <>Activez <strong>Mode intelligent</strong> et désignez le dossier racine avec l’icône dossier. En équipe, il s’agit de <strong>Mon dossier d’acquisitions</strong>.</>,
                    <>Si vos noms de fichiers contiennent des mesures de qualité, renseignez la <strong>Structure des noms de fichiers</strong> de votre logiciel. La détection utilise aussi les noms et les sous-dossiers pour reconnaître filtres et poses.</>,
                    <>Enregistrez, puis ouvrez <strong>Acquisitions</strong> et cliquez sur <strong>Actualiser les acquisitions</strong>. Choisissez ou autorisez le dossier lorsque le navigateur le demande.</>,
                  ]} />
                  <Note>Le comptage vient du scan : pas d’ajustement manuel de la quantité. Relancez l’actualisation après une nouvelle nuit. Les fichiers restent sur votre disque ; le graphique utilise les mesures disponibles, sans en inventer.</Note>
                </div>
                <div className="border-t border-border pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
                  <h3 className="text-xl font-medium">Manuel — nuit par nuit</h3>
                  <Steps items={[
                    <>Désactivez <strong>Mode intelligent</strong> et enregistrez : aucun dossier n’est demandé pour ce suivi.</>,
                    <>Dans <strong>Acquisitions</strong>, ouvrez <strong>Saisie manuelle par nuit</strong>. Choisissez la date du soir de la nuit, la ligne <strong>Filtre / pose</strong> et la quantité de brutes.</>,
                    <>Cliquez sur <strong>Ajouter</strong>. Répétez pour chaque filtre, durée ou panneau. La corbeille d’une saisie permet de corriger une erreur.</>,
                  ]} />
                  <Note>Une saisie augmente l’acquis et diminue le reste à faire : elle ne change pas l’objectif. Sans fichiers indexés, il n’y a pas de qualité individuelle à analyser.</Note>
                </div>
              </div>
              <Note><strong>Graphique de qualité :</strong> masqué pour un projet personnel en manuel ; en équipe, visible par tous dès qu’au moins un participant est en intelligent. Les saisies manuelles n’ajoutent pas de points au graphique.</Note>
            </Chapter>

            <Chapter id="teams" title="Une cible, plusieurs participants">
              <Steps items={[
                <>Dans <strong>Teams</strong>, cliquez sur <strong>Ajouter une nouvelle team</strong>, donnez un nom et choisissez le mode de gestion : <strong>Administrateur unique</strong> ou <strong>Collaboratif</strong>.</>,
                <>Ouvrez la team et utilisez <strong>Inviter</strong> avec l’email du participant. Il reçoit un lien d’invitation ; un lien à copier reste disponible. Il rejoint avec le compte correspondant à l’adresse invitée, ou crée un compte si nécessaire.</>,
                <>Créez un projet associé à cette team. Chaque membre ouvre ensuite sa configuration et définit <strong>son setup, son site, son mode de suivi, son cadrage et ses objectifs</strong>.</>,
                <>Le cadrage unique superpose les champs des participants. Un membre peut avoir une mosaïque et un autre un panneau simple : chacun garde son propre plan.</>,
                <>Le rappel des objectifs des autres membres permet de comparer les contributions. Dans Acquisitions, le menu <strong>Afficher</strong> permet de consulter le projet entier ou un participant.</>,
              ]} />
              <Note>Chacun règle sa contribution, pas le dossier ni les objectifs de ses collègues. Le nom du projet et la team sont réservés à l’administration. Le matériel et les sites d’un autre membre ne deviennent pas sélectionnables dans votre configuration. Les fichiers distants ne peuvent pas être déplacés depuis votre ordinateur.</Note>
            </Chapter>

            <Chapter id="progression" title="Suivre les acquisitions">
              <p className="leading-relaxed text-muted-foreground">Choisissez votre projet dans <strong>Acquisitions</strong>. Chaque ligne compare l’objectif et les brutes acquises pour un filtre et une durée de pose ; les panneaux et participants restent distincts.</p>
              <Steps items={[
                <>Vérifiez le projet et, en équipe, le participant choisi dans <strong>Afficher</strong>. La progression rassemble uniquement les objectifs assignés aux membres.</>,
                <>En intelligent, actualisez votre dossier ; en manuel, ajoutez les quantités par nuit. Le nombre restant correspond à l’objectif moins l’acquis, sans devenir négatif une fois l’objectif dépassé.</>,
                <>Comparez aussi le temps d’intégration : <strong>nombre de brutes × durée de pose</strong>. Plusieurs durées d’un filtre restent séparées pour éviter de confondre leurs objectifs.</>,
              ]} />
              <Figure src={framesAsset.url} alt="Progression des acquisitions par filtre et panneau" caption="Exemple de progression : les lignes du plan permettent de voir ce qui est acquis et ce qu’il reste à faire." />
            </Chapter>

            <Chapter id="qualite" title="Lire la qualité des brutes">
              <p className="leading-relaxed text-muted-foreground">Le graphique présente les mesures extraites des brutes indexées : <strong>FWHM, HFR, excentricité, nombre d’étoiles et température du capteur</strong>. Une valeur absente ne peut pas être affichée.</p>
              <Steps items={[
                <>Choisissez <strong>Tous</strong> ou un groupe filtre / durée, par exemple L · 180 s. Pour une mosaïque, cochez les panneaux à comparer.</>,
                <>Cochez les mesures souhaitées. L’axe reprend leurs valeurs ; comparez de préférence une mesure à la fois et des acquisitions prises dans des conditions comparables.</>,
                <>Repérez les nuits, leurs séparateurs et les informations lunaires. Cliquez sur une nuit pour la cadrer, ou zoomez horizontalement avec la molette et la barre sous le graphique.</>,
                <>Ouvrez <strong>Conditions par nuit</strong> sous le graphique pour mettre les variations en relation avec le site et la lune.</>,
              ]} />
              <Figure src={qualityAsset.url} width={1690} height={1240} alt="Graphique de qualité des brutes avec nuits et mesures" caption="Les mesures aident à repérer une série inhabituelle ; l’aperçu de l’image permet de confirmer votre choix." />
              <Note>Les points ont le même diamètre : <strong>pleins pour vos brutes</strong>, <strong>creux pour celles des autres membres</strong>. Un point plein ne dispense pas d’autoriser l’accès au dossier local pour ouvrir l’image. Les courbes ne relient pas les acquisitions de membres différents.</Note>
            </Chapter>

            <Chapter id="preselection" title="Présélectionner les brutes, puis vérifier">
              <p className="leading-relaxed text-muted-foreground">La présélection est une aide au tri, pas un rejet automatique. Vous choisissez une zone, inspectez les images, puis cochez uniquement celles que vous voulez écarter.</p>
              <h3 className="mt-8 text-xl font-medium">Cliquer sur une brute</h3>
              <Steps items={[
                <>Cliquez sur un <strong>point du graphique</strong> pour ouvrir l’aperçu de la brute correspondante, si le fichier est disponible sur votre ordinateur.</>,
                <>Si le dossier n’est pas accessible, actualisez les acquisitions et choisissez le bon dossier, puis autorisez sa lecture. Les mesures d’un autre membre restent consultables, mais son fichier n’est pas automatiquement disponible chez vous.</>,
                <>Inspectez l’image. L’aperçu FITS applique un <strong>autostretch</strong> pour rendre les détails visibles ; la loupe au survol aide à examiner les étoiles. Fermez l’aperçu pour revenir au graphique.</>,
              ]} />
              <h3 className="mt-10 text-xl font-medium">Sélectionner plusieurs brutes</h3>
              <Steps items={[
                <>Sur le graphique, <strong>cliquez, maintenez et glissez horizontalement</strong> sur l’intervalle à examiner. Relâchez : la liste des images de cet intervalle apparaît sous le graphique. Il s’agit d’une plage horizontale, pas d’un seuil automatique de qualité.</>,
                <>Cliquez sur le <strong>nom ou la ligne d’une brute</strong> dans cette liste pour ouvrir son aperçu. Consultez ses mesures et inspectez l’image avant de décider.</>,
                <>Cochez uniquement les brutes à rejeter. La case <strong>Tout cocher</strong> concerne les lignes que vous êtes autorisé à trier. <strong>Sélectionner une zone ne coche aucune brute automatiquement.</strong></>,
                <>Cliquez sur <strong>Rejeter cochées (nombre) → _rejetées</strong>. Autorisez la modification du dossier si elle est demandée.</>,
                <>Les fichiers sont déplacés dans le sous-dossier <strong>_rejetées</strong> et retirés de l’index du projet ; la progression est recalculée. <strong>Effacer la sélection</strong> ferme seulement la liste, sans modifier les fichiers.</>,
              ]} />
              <Note><strong>Rien n’est supprimé définitivement du disque.</strong> Le dossier _rejetées est ignoré lors des actualisations suivantes. Le déplacement demande Chrome ou Edge avec accès au dossier en lecture/écriture ; s’il est bloqué dans l’aperçu intégré, ouvrez Photonlog dans un onglet séparé. Les brutes des autres participants ne sont pas cochables pour votre tri.</Note>
            </Chapter>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
              <Button asChild variant="outline"><Link to="/"><ArrowLeft />Retour à l’accueil</Link></Button>
              <Button asChild><Link to={appEntry}>{session ? "Ouvrir Photonlog" : "Commencer"}<ArrowRight /></Link></Button>
            </div>
          </div>
        </div>
      </main>
      <footer className="border-t border-border px-5 py-6 text-center text-xs text-muted-foreground"><Link to="/confidentialite" className="hover:text-foreground">Confidentialité &amp; cookies</Link></footer>
    </div>
  );
};

export default Guide;
