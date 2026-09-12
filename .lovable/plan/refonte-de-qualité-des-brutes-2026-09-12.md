# Refonte de « Qualité des brutes »

## Résultat attendu
- Afficher les filtres disponibles en haut à droite sous forme d’onglets, avec un seul filtre visible à la fois.
- Remplacer les boutons de mesure par de petites cases à cocher pour afficher simultanément FWHM, excentricité, HFR, étoiles et température.
- Normaliser chaque mesure sur une échelle commune afin que les courbes restent comparables, tout en conservant les valeurs réelles dans l’infobulle.
- Maintenir au moins une mesure active pour éviter un graphique vide involontaire.
- Représenter les nuits par des bandes verticales discrètes dans le graphique.
- Afficher sous le graphique chaque nuit avec une petite case permettant de l’inclure ou de la masquer.
- Conserver la sélection des panneaux pour les mosaïques, sous une forme compacte.
- Ajouter sous le graphique une barre de vue d’ensemble : sa fenêtre se resserre avec le zoom à la molette et indique la portion actuellement visible.
- Garder le clic sur un point pour ouvrir l’image et conserver le bouton de remise à zéro du zoom.

## Détails techniques
- Réorganiser les données autour du filtre actif, des mesures actives et des nuits actives.
- Calculer la normalisation séparément pour chaque mesure à partir des images actuellement retenues.
- Générer une série par mesure, au lieu d’une série par filtre, avec couleurs et légende propres aux mesures.
- Calculer les limites chronologiques de chaque nuit pour dessiner les bandes et aligner les sélecteurs sous le graphique.
- Synchroniser la barre de vue d’ensemble avec la plage de zoom sans modifier le comportement de la molette.
- Vérifier l’affichage sur écran large et mobile, ainsi que l’ouverture d’une brute depuis un point.
