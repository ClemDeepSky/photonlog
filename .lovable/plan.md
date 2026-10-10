# Projets Team : fusion des contributions

## Ce que vous obtiendrez
- **Ma contribution** (dans chaque projet Team) : chaque membre choisit son setup, son mode (manuel / automatique), son dossier d'acquisitions, et son propre plan : filtres, durées de pose, quantités, par panneau si c'est une mosaïque.
- **Droits** : chacun modifie uniquement sa contribution. L'administrateur de la team (mode « admin unique ») peut modifier celles de tout le monde. En mode collaboratif, chacun ne touche qu'à la sienne.
- **Cadrage** : un cadre par participant, de la couleur du participant, à la taille du champ de son setup, avec une légende (nom + setup) et la possibilité d'afficher ou masquer chaque participant.
- **Progression et graphique de qualité** : tout le monde voit la courbe du projet entier, avec un filtre par participant (Tous / Moi / X…). Le plan global se calcule comme la somme des plans des participants.
- **Tri des brutes** (déplacement vers `_rejetées`) : on ne peut le faire que sur ses propres brutes, depuis son propre dossier. Les cases à cocher n'apparaissent pas sur les brutes des autres.
- Projets personnels : rien ne change.

## Modifications de la base (uniquement des ajouts, rien n'est supprimé)
1. Une nouvelle colonne facultative `contribution_id` pour les **lignes du plan** : si elle est remplie, la ligne fait partie du plan de ce participant. Si elle est vide, c'est le plan commun actuel, qui reste intact.
2. Une nouvelle colonne facultative `contribution_id` pour les **brutes indexées** : elle indique à qui appartient chaque brute. Les brutes déjà indexées restent sans participant et s'affichent comme « commun ».
3. **Règles d'accès** :
   - les lignes du plan d'un participant ne peuvent être modifiées que par lui-même ou par l'administrateur de la team ;
   - chaque membre ne peut indexer des brutes que sur sa propre contribution ;
   - tous les membres peuvent lire toutes les données.
4. Une contribution par membre et par projet (contrainte d'unicité), créée automatiquement la première fois que vous ouvrez « Ma contribution ».

## Étapes
1. Ajouts dans la base + règles d'accès.
2. Section « Ma contribution » dans la page projet : setup, mode, dossier, plan par filtre et par panneau (même éditeur que le plan actuel). Les contributions des autres s'affichent en lecture seule.
3. Le scanner de dossier rattache les brutes à votre contribution.
4. Cadrage multi-participants (couleurs, légende, champ de chaque setup).
5. Progression et graphique : vue globale plus filtre par participant ; tri limité à ses propres brutes.
6. Mise à jour du guide.

## Questions ouvertes (réglées par défaut si vous ne dites rien)
- Les brutes déjà indexées sur un projet Team sont laissées en « commun ». Je peux aussi les attribuer au créateur du projet.
- En mode collaboratif, personne ne modifie la contribution d'un autre.
