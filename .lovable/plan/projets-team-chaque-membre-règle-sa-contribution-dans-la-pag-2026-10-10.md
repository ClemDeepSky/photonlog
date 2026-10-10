# Projets Team : chaque membre règle sa contribution dans la page Projet

## Ce que vous obtiendrez
- **Page Projet (modification)** d'un projet Team : une section **« Ma contribution »**, où chaque membre règle :
  - **son setup** (pris dans son matériel) ;
  - **son propre cadrage** : sa mosaïque à lui (nombre de panneaux, RA/DEC, angle), avec les mêmes champs Manuel / CSV et J2000 / JNow que le projet ;
  - **ses objectifs par filtre** (et par panneau si c'est une mosaïque) : filtre, durée de pose, quantité ;
  - **son dossier d'acquisitions**, sur son propre poste. Le membre A règle le dossier A et le membre B le dossier B. Personne n'a accès au dossier d'un autre.
- **Rappel des autres membres** sous la section : setup, nombre de panneaux et objectifs par filtre de chacun, en lecture seule.
- **Cadrage** : la carte affiche vos cadres en plein, et ceux des autres membres en pointillé, à leur couleur. On peut masquer chaque membre.
- **Plan commun = objectif global** : le plan du projet défini par l'administrateur reste l'objectif de l'équipe. Les objectifs des membres s'affichent en face, pour voir comment l'équipe se répartit le travail.
- **Page Frames** : plus aucun réglage. Le bloc « Contributions des participants » est retiré. La page sert seulement à actualiser votre propre dossier (le scan reste limité à vos brutes) et à afficher la progression et la qualité, avec le choix Projet complet / par membre.
- **Droits** : chacun ne modifie que sa contribution. L'administrateur unique de la team peut toutes les modifier.

## Modifications de la base (ajout seulement, rien n'est supprimé)
- Une colonne facultative « contribution » sur les **panneaux** :
  - vide : c'est un panneau du projet (cadrage commun actuel, inchangé) ;
  - remplie : c'est un panneau de la mosaïque personnelle d'un membre.
- Règles d'accès sur ces panneaux personnels : tous les membres peuvent les lire, et seuls leur propriétaire et l'administrateur unique peuvent les modifier. C'est le même principe que pour les objectifs, déjà en place.
- Les panneaux actuels restent sur le cadrage commun. Leurs liens avec les brutes et les objectifs sont conservés.

## Étapes
1. Ajout de la colonne et des règles d'accès sur les panneaux.
2. Section « Ma contribution » dans la page de modification du projet. Elle réutilise les champs de coordonnées et de cadrage actuels.
3. Rappel des contributions des autres membres, et objectif global en regard.
4. Cadrage avec plusieurs membres : vos cadres en plein, ceux des autres en pointillé.
5. Allègement de la page Frames : réglages retirés, dossier et scan propres à chaque membre.
6. Le classement des brutes par panneau utilise la mosaïque personnelle du membre.
7. Vérification complète dans le navigateur, puis mise à jour du guide.

## Détails techniques
- Ajout de `project_panes.contribution_id` (nullable, clé étrangère vers `project_contributions`). Les règles en vigueur se limitent aux lignes à `contribution_id` NULL. De nouvelles règles utilisent `can_edit_contribution` pour l'insertion, la modification et la suppression, et `can_access_project` pour la lecture.
- Les objectifs (`project_acquisitions`) d'un membre sur une mosaïque pointent vers ses propres panneaux (`pane_id`).
- `EditProject` ne charge le plan commun et les panneaux communs que pour `contribution_id IS NULL`. La nouvelle section passe par le composant partagé `ProjectCoordinates`.
- Le dossier (`folder_path`) et le pattern de nommage sont rangés dans la contribution. Le handle du dossier reste dans le navigateur du membre, comme aujourd'hui.
