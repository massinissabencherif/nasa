# Maquettes HESTIA — passation du 14 novembre 2026

[Ouvrir la galerie](index.html) ·
[Brief Fable](../../prompt/2026-11-14-fable-ui-handoff-fr.md) ·
[Audit des composants](../../sources/2026-11-14-design-system-audit.md) ·
[Décisions D16–D17](../../decisions.md)

Ces fichiers sont dans le dépôt pour être accessibles à David, Massi,
Claude et Codex après transmission du travail. Aucun chemin temporaire ni
service externe n’est nécessaire pour ouvrir la galerie. Elle affiche des
images, pas une application interactive.

## Ce qui est retenu

Space Grotesk, le bleu nuit et le cyan vif d’origine, la grande silhouette
et ses huit zones. Le dessin précis des icônes, le petit monogramme H,
les surfaces et les dispositions des pages ne sont pas tous validés.
La mascotte n’est pas incluse. Les variantes rejetées (corps réduit,
palette graphite/cyan adouci) ne sont pas la cible de cette passation.

## Images individuelles

| Vue | Image | État / limite |
|---|---|---|
| Accueil actuel | [home-current.png](images/home-current.png) | Capture du produit existant, avant finition |
| Accueil proposé | [home-proposed.png](images/home-proposed.png) | Grande silhouette conservée ; typographie, dates et action principale revues |
| Bilan : ressenti | [checkin-feel.png](images/checkin-feel.png) | Proposition ; questions actuelles, sans second questionnaire |
| Bilan : mesures | [checkin-measure.png](images/checkin-measure.png) | Proposition ; champs vides ; revue/enregistrement/erreurs encore à concevoir |
| Test de réaction | [reaction.png](images/reaction.png) | Introduction proposée ; exemple de signal, pas un test actif ; 3 + 15 inchangé |
| Test interrompu | [reaction-interrupted.png](images/reaction-interrupted.png) | Exemple d’état après sauvegarde ; conserver aussi l’état en attente de synchronisation |
| Repas | [meal.png](images/meal.png) | Données simulées existantes ; bouton sans action ; liste complète à conserver |
| Réserve | [pantry.png](images/pantry.png) | Photo de test existante, générée par IA ; défilement vertical ; ne pas perdre les noms des produits ni l’accès à la photo entière |
| Historique | [history.png](images/history.png) | Courbe issue des mesures simulées existantes ; tous les filtres ne sont pas dessinés |
| Équipage station | [station-crew.png](images/station-crew.png) | Quatre profils fictifs, dernier bilan du 13 novembre ; cas non nominaux à vérifier ensuite |
| Terre station | [station-earth.png](images/station-earth.png) | État vide du jeu de démonstration ; transmission/réponse non représentées ici |
| Alertes station | [station-alerts.png](images/station-alerts.png) | État sans alerte active ; cartes et actions des alertes restent à traiter |

Planches : [bilan et réaction](images/flow.png),
[repas, réserve, historique](images/daily.png),
[équipage, Terre, alertes](images/station.png).

## Provenance et vérifications

Les prototypes sont des compositions HTML/CSS rendues dans Chrome avec
les vrais fichiers Space Grotesk et Plex Mono. Les valeurs proviennent de
la base de démonstration jetable déjà utilisée pour la revue locale ; les
noms de l’équipage sont fictifs. Le corps reprend les tracés de
SilhouetteBody. La photo de réserve est celle du jeu de test existant,
avec son caractère généré signalé. Ces images de navigateur ne sont pas
des rendus typographiques approximatifs issus d’un générateur d’images.

Téléphone : 390 × 844 ; contrôle d’absence de débordement horizontal à
360 × 780. Station : 1280 × 800. Plusieurs pages défilent : une capture
n’affiche pas nécessairement tout leur contenu. Pas de validation des
interactions, du téléphone physique, de la caméra, du lecteur d’écran ou
de la compréhension par un nouvel utilisateur dans cette passe.

[render-checks.json](render-checks.json) conserve les contrôles des dix
vues autres que l’accueil. Le champ font vérifie le chargement de la police ;
overflow concerne la largeur du document. mainScroll décrit le conteneur
mobile. Ce fichier n’est pas un test de la future implémentation.

[manifest.json](manifest.json) liste les images, dimensions et empreintes
SHA-256. L’export est autonome ; les scripts expérimentaux et les URL
temporaires de prévisualisation ne font pas partie de la cible à intégrer.

**Aucune de ces maquettes n’est encore intégrée dans HESTIA.** Les pages
profil, réglages, calibration et simulateur n’ont pas reçu de maquette de
finition dans ce lot. Ne pas les supprimer pour autant.
