# Photonlog V2 — feuille de route

## Fait
- Schéma additif : contributions, sessions, lots de poses, objectif en temps, lien brute→session. Rien de supprimé.
- Interrupteur V1/V2 dans le menu (retour arrière immédiat), navigation V2 sans « Frames ».
- Moteur de progression unique (temps d'intégration principal, poses en secondaire).
- Tableau de bord V2 orienté action, liste des projets V2.
- Espace de travail projet à onglets : Vue d'ensemble, Plan, Sessions, Qualité, Contributions (équipe), Paramètres.
- Mode manuel : sessions et lots de poses saisis.
- Mode automatique : le scan du dossier reconstruit sessions et lots.
- Activation V2 projet par projet, sans migration destructive.
- Enregistrement d'un projet : mise à jour en place des panneaux et des lignes de plan (les brutes indexées gardent leur lien).
- Coordonnées et cadrage réunis : setup hérité, panneaux empilés et Manuel/CSV avec J2000/JNow communs aux projets simples et mosaïques ; vérifiés à l'écran sans modifier les données enregistrées.
- Listes et statistiques ordinaires V1/V2 limitées aux projets personnels et aux équipes de l’utilisateur ; cinq pages vérifiées avec une session connectée. Liste Teams limitée aux appartenances et équipes créées.
- Plan commun retiré de l’affichage (Frames et rappel des objectifs) : seules les objectifs assignés à un membre sont visibles ; les 12 lignes sans membre de « test team » restent en base.
- Page Mon compte : export CSV, changement d’email et de mot de passe, photo de profil, nom d’utilisateur, suppression du compte (avec la fonction serveur associée) ; simple pastille d’avatar en haut à droite ouvrant un menu « Profil » / « Déconnexion », vérifié à l’écran sur les deux tailles.
- Guide d’utilisation déplacé dans le menu utilisateur (« Profil », « Guide d’utilisation », « Déconnexion ») ; retiré de la barre latérale et du menu mobile, vérifié à l’écran.
- Photo de profil : visible par les membres de vos équipes (droit ajouté en base) ; pas encore affichée à côté des noms dans les pages d’équipe.
- Suppression d’un compte : les équipes sont confiées au membre le plus ancien (le seul restant devient administrateur) ; une équipe n’est effacée que si plus personne n’y reste.
- « test team » : les 12 objectifs sans membre ont été supprimés de la base ; les brutes liées sont conservées.

## Ouvert (en attente de vos réponses)
- Progression principale en temps aussi pour les projets personnels (à confirmer).
- Vocabulaire FR/EN validé avant reprise des textes de toute l'application.
- Simplification de la fiche matériel (principal / complémentaire) et presets de convention de nommage.
- Qualité : brutes suspectes, accepté/rejeté, intégration exploitable (architecture prête, non implémentée).
- Contributions d'équipe : dossier et setup propres à chaque membre à exposer dans l'interface de création.
