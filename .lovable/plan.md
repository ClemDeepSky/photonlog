# Photonlog V2 — Audit et architecture proposée

Aucune modification n'a été faite. Rien n'est supprimé, rien n'est migré. Ce document est l'analyse demandée.

## 1. Architecture actuelle (V1), en résumé

- Navigation : Tableau de bord, Projets, Matériel, Équipes, Frames, Administration.
- Un projet contient : une cible et des coordonnées, éventuellement des panneaux (mosaïque), et un plan d'acquisitions (filtre, durée de pose, quantité, binning, nombre acquis).
- Les brutes indexées vivent dans une page « Frames » séparée, reliée au projet par un paramètre d'URL. La notion de **session (nuit) n'existe pas** : les nuits sont recalculées à la volée dans les graphiques de qualité.
- Le suivi des acquisitions a deux sources concurrentes, sans distinction enregistrée : saisie manuelle (+/−) et scan du dossier local. Le scan écrase toujours la saisie manuelle.
- Le dossier local est attaché **au projet** (chemin en base + autorisation mémorisée dans le navigateur), pas au contributeur.
- Les équipes existent (rôles, mode admin unique / collaboratif) mais la page d'équipe n'affiche pas encore ses projets.

## 2. Incohérences entre la demande et le code existant

1. **Pas de session** : à créer, c'est le vrai manque structurel.
2. **Source de vérité ambiguë** : `acquired` est écrit par le manuel et par le scan. La V2 doit trancher par projet (ou par contribution).
3. **Dossier local au niveau projet** : incompatible avec les projets d'équipe multi-contributeurs.
4. **Un seul setup par projet** : idem, à déplacer au niveau contribution pour les équipes.
5. **Progression calculée 5 fois différemment** (tableau de bord, liste des projets, statistiques, frames, administration) — dont une variante non pondérée par la durée de pose, qui donne des pourcentages différents pour le même projet.
6. **L'édition d'un projet efface et recrée son plan** : les brutes déjà rattachées à une ligne du plan perdent leur lien. Bug réel, à corriger dans la V2.
7. Deux dictionnaires de filtres différents (scan de dossier / import AstroBin).
8. Un ancien module de scan est présent mais inutilisé.

## 3. Modèle de données V2 proposé (additif uniquement)

Aucune table ni colonne existante n'est supprimée ou renommée. On ajoute :

- `projects.tracking_mode` (`manual` | `automatic`, défaut `manual`) et `projects.schema_version` (1 par défaut, 2 pour les projets V2). C'est ce champ qui décide quelle interface s'affiche et permettra plus tard le passage manuel → automatique.
- `project_contributions` : une ligne par membre contribuant à un projet (projet, utilisateur, mode manuel/automatique, setup, chemin du dossier local). Pour un projet personnel : une seule ligne, celle du propriétaire. C'est ici que vivent dossier et setup — plus au niveau du projet.
- `project_sessions` : une session = une période réelle d'acquisition (début, fin, contribution, source `manual`/`automatic`, note). Les sessions automatiques sont reconstruites depuis les brutes ; les manuelles sont saisies.
- `session_batches` : un lot de poses dans une session (filtre, durée de pose, nombre de poses, binning, panneau éventuel). C'est l'unité de saisie du mode manuel, et le résumé calculé d'une session automatique. Le temps d'intégration se déduit toujours de là.
- `project_frames.session_id` (nullable) : rattache une brute indexée à sa session.
- Le plan d'acquisition reste `project_acquisitions`, avec deux ajouts pour les équipes : un objectif exprimable en **temps** (`target_seconds`) en plus du nombre de poses.

Conséquence importante : `acquired` cesse d'être une donnée saisie et devient une valeur **dérivée** des lots de poses. La colonne est conservée telle quelle pour la V1 ; la V2 lit les lots.

## 4. Stratégie de coexistence V1 / V2

- Une seule base, un seul compte, tables additives : la V1 continue de lire exactement ce qu'elle lit aujourd'hui.
- Les écrans V2 vivent sur des routes préfixées `/v2/...` (tableau de bord, projets, projet avec onglets). Les écrans V1 restent en place et inchangés.
- Un interrupteur « Essayer la V2 / Revenir à la V1 » dans le menu, mémorisé par compte. Retour arrière immédiat, à tout moment.
- Un projet marqué `schema_version = 2` s'ouvre dans l'interface V2 ; les projets existants restent en V1 jusqu'à conversion explicite, projet par projet, sur votre demande.

## 5. Migrations de données nécessaires

Aucune migration destructive, et rien d'automatique sans votre accord :

- Migration de schéma (additive) : les tables et colonnes du point 3.
- Backfill facultatif, déclenché projet par projet : créer une contribution pour le propriétaire (reprenant setup et dossier actuels), reconstruire les sessions depuis les brutes déjà indexées (regroupement par nuit), et créer des lots équivalents. Les données V1 restent intactes en parallèle.
- Pour un projet sans brutes indexées, la conversion crée une session unique « historique » regroupant les poses déjà comptabilisées, afin de ne perdre aucun chiffre.

## 6. Composants réutilisables tels quels

Carte du ciel, saisie des coordonnées, sélecteurs de catalogue matériel, image de projet, import Telescopius et AstroBin, moteur d'analyse des noms de fichiers, mémorisation du dossier local, aperçu des brutes, graphiques de qualité, projet de démonstration et visite guidée.

## 7. À refactoriser

- Un seul calcul de progression partagé (temps d'intégration en unité principale, nombre de poses en secondaire), utilisé par tous les écrans.
- Un seul dictionnaire de filtres.
- Le scan de dossier écrit désormais des sessions et des lots, plus directement un compteur.
- L'édition du plan par mise à jour ciblée au lieu d'effacer/recréer.
- La page projet devient l'espace de travail à onglets : Vue d'ensemble, Plan, Sessions, Qualité, Paramètres (+ Contributions pour une équipe).
- Suppression du module de scan mort (aucune fonctionnalité perdue).

## 8. Risques techniques principaux

- Le regroupement automatique en nuits dépend de la présence des dates dans les noms de fichiers : sans date, une session « indéterminée » est créée plutôt qu'un échec.
- Les autorisations de dossier local sont propres au navigateur et à la machine : rien ne change, mais chaque contributeur d'équipe devra autoriser son propre dossier.
- Double affichage des mêmes projets en V1 et V2 pendant la transition : d'où le marquage par projet.
- Objectifs en temps vs en poses : conversion nécessaire pour les plans existants.

## 9. Plan d'implémentation

1. Schéma additif + interrupteur V1/V2 + squelette des routes V2.
2. Moteur de progression partagé et modèle Projet/Sessions/Lots.
3. Mode manuel complet (sessions et lots saisis).
4. Mode automatique branché sur le nouveau modèle (le scan produit sessions et lots).
5. Projets d'équipe et contributions individuelles.
6. Tableau de bord V2 orienté action.
7. Qualité recontextualisée dans projet → session → brutes.
8. Rationalisation du matériel, des presets de nommage et du vocabulaire.

## 10. Vocabulaire proposé

| Français | Anglais (code) |
|---|---|
| Projet | project |
| Plan d'acquisition | acquisition plan |
| Objectif | target |
| Session | session |
| Lot de poses | batch |
| Pose | sub |
| Brute | frame |
| Setup | setup |
| Contribution | contribution |
| Progression | progress |
| Temps d'intégration | integration time |

Règle : « pose » pour l'unité planifiée ou comptée, « brute » uniquement pour un fichier réellement indexé. On abandonne « frame » et « image » dans les textes visibles.

## Questions avant de commencer

1. Coexistence : routes `/v2/...` avec interrupteur dans le menu, ou préférez-vous un projet Lovable séparé pour la V2 ?
2. Conversion : projet par projet à votre demande, ou tous vos projets convertis d'un coup dès la phase 3 ?
3. Objectifs : dans les projets personnels aussi, la progression principale passe-t-elle en temps d'intégration, ou reste-t-elle en nombre de poses ?
4. Vocabulaire : le tableau ci-dessus vous convient-il avant que je touche aux textes ?
