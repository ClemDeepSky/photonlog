import { Link } from "react-router-dom";
import { Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-medium text-foreground">{title}</h2>
    <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

const Privacy = () => {
  const { reopen } = useCookieConsent();

  return (
    <div className="min-h-screen bg-cosmic">
      <header className="border-b border-border/20">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Telescope className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-gradient">Photonlog</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Retour à l'application</Link>
          </Button>
        </div>
      </header>

      <main className="w-full max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-medium text-foreground">
            Politique de confidentialité et RGPD
          </h1>
          <p className="text-sm text-muted-foreground">
            Cette page explique quelles données Photonlog collecte, pourquoi, et comment exercer
            vos droits conformément au Règlement Général sur la Protection des Données (RGPD).
          </p>
        </div>

        <Section title="Responsable du traitement">
          <p>
            Photonlog est responsable du traitement des données collectées via l'application.
            Pour toute question relative à vos données, vous pouvez nous contacter à l'adresse
            de contact indiquée sur le site.
          </p>
        </Section>

        <Section title="Données collectées">
          <ul className="list-disc pl-5 space-y-1">
            <li>Données de compte : nom, adresse email, mot de passe chiffré.</li>
            <li>Données d'équipe : nom de la team, logo, membres et invitations.</li>
            <li>
              Données d'usage astro : projets, coordonnées de cadrage, profils de matériel,
              acquisitions et frames enregistrées.
            </li>
            <li>Données techniques strictement nécessaires au fonctionnement (session, sécurité).</li>
          </ul>
        </Section>

        <Section title="Finalités et bases légales">
          <ul className="list-disc pl-5 space-y-1">
            <li>Fournir le service (exécution du contrat) : compte, projets, suivi d'acquisitions.</li>
            <li>Sécuriser l'accès (intérêt légitime) : authentification, prévention des abus.</li>
            <li>Mesure d'audience et confort d'usage (consentement) : cookies optionnels.</li>
          </ul>
        </Section>

        <Section title="Durée de conservation">
          <p>
            Vos données sont conservées tant que votre compte est actif. Après suppression du
            compte, elles sont effacées ou anonymisées dans un délai maximal de 30 jours, hors
            obligations légales de conservation.
          </p>
        </Section>

        <Section title="Sous-traitants et hébergement">
          <p>
            Les données sont hébergées au sein de l'Union européenne par notre prestataire
            d'infrastructure (base de données, authentification, stockage de fichiers). Aucune
            donnée n'est vendue à des tiers.
          </p>
        </Section>

        <Section title="Vos droits">
          <ul className="list-disc pl-5 space-y-1">
            <li>Droit d'accès, de rectification et d'effacement de vos données.</li>
            <li>Droit à la portabilité (export de vos projets et acquisitions).</li>
            <li>Droit d'opposition et de limitation du traitement.</li>
            <li>Droit de retirer votre consentement aux cookies à tout moment.</li>
            <li>Droit d'introduire une réclamation auprès de la CNIL.</li>
          </ul>
        </Section>

        <Section title="Cookies">
          <p>
            Photonlog utilise des cookies et stockages locaux strictement nécessaires pour
            maintenir votre session connectée. Les cookies de mesure d'audience et de
            personnalisation ne sont déposés qu'après votre consentement explicite.
          </p>
          <Button variant="outline" size="sm" onClick={reopen} className="mt-2">
            Modifier mes préférences de cookies
          </Button>
        </Section>
      </main>

      <footer className="border-t border-border/20 py-6 text-center text-xs text-muted-foreground">
        Photonlog — Dernière mise à jour : septembre 2026
      </footer>
    </div>
  );
};

export default Privacy;
