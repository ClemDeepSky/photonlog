import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent } from "@/hooks/useCookieConsent";

const CookieBanner = () => {
  const { isOpen, preferences, acceptAll, rejectAll, save, close } = useCookieConsent();
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [prefs, setPrefs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAnalytics(preferences?.analytics ?? false);
      setPrefs(preferences?.preferences ?? false);
      setDetails(false);
    }
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-border/40 bg-card/95 backdrop-blur p-5 shadow-lg space-y-4">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Gestion des cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nous utilisons des cookies nécessaires au fonctionnement de Photonlog (connexion,
              sécurité). Avec votre accord, nous ajoutons des cookies de mesure d'audience et de
              confort. Voir la{" "}
              <Link to="/confidentialite" className="text-primary underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </div>
        </div>

        {details && (
          <div className="space-y-3 border-t border-border/30 pt-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">Nécessaires</p>
                <p className="text-xs text-muted-foreground">Session, authentification, sécurité.</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">Mesure d'audience</p>
                <p className="text-xs text-muted-foreground">Statistiques d'usage anonymisées.</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-foreground">Confort d'usage</p>
                <p className="text-xs text-muted-foreground">
                  Mémorisation de vos préférences d'affichage.
                </p>
              </div>
              <Switch checked={prefs} onCheckedChange={setPrefs} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setDetails((d) => !d)}>
            {details ? "Masquer les détails" : "Personnaliser"}
          </Button>
          <Button variant="outline" size="sm" onClick={rejectAll}>
            Refuser
          </Button>
          {details ? (
            <Button size="sm" onClick={() => save({ analytics, preferences: prefs })}>
              Enregistrer mes choix
            </Button>
          ) : (
            <Button size="sm" onClick={acceptAll}>
              Tout accepter
            </Button>
          )}
          {preferences && (
            <Button variant="ghost" size="sm" onClick={close}>
              Fermer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
