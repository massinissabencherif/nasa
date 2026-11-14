# Fable — finition des interfaces HESTIA

Pour David, Massi et l’agent qui reprend. Préparé par Astra le 14 novembre
2026, après revue des écrans avec David.

**État : passation et maquettes uniquement. Aucun changement de code UI dans
cette passe.** David a autorisé ce dossier documentaire et ses images ; ce
n’est pas une autorisation générale de coder, installer, committer ou publier.
Ce brief conserve le contexte. Les règles restent dans
[AGENTS.md](../../../AGENTS.md), les choix dans [decisions.md](../decisions.md)
(D16–D17), et l’avancement dans [STATUS.md](../STATUS.md).

## Commencer ici

1. Lire AGENTS.md, [l’index](../README.md), STATUS.md et decisions.md.
2. Ouvrir la [galerie locale](../design/2026-11-14/index.html) ou son
   [index Markdown](../design/2026-11-14/README.md), puis
   [l’audit du design system](../sources/2026-11-14-design-system-audit.md).
3. Lire [development.md](../development.md) et identifier le propriétaire
   du prochain lot avant toute édition du code.

Le dépôt Git est `astronaut-health`, l’application est dans `hestia/`.
La branche locale est **feat/reaction-protocol**, HEAD **5ff5ef3**. Le lot
réaction est implémenté mais **non committé** : fichiers suivis modifiés et
nouveaux fichiers non suivis. Ne pas repartir d’un checkout propre de main
en supposant qu’il contient ce travail, ni nettoyer/stasher/changer de
branche implicitement. Organiser sa transmission avec David ; Massi ne
récupérera pas ces fichiers par un pull tant qu’ils ne sont pas partagés.

## Ce que David a choisi

- **Space Grotesk**, variante B du comparatif, pour l’interface. Garder
  Plex Mono pour les mesures et durées. Space Grotesk n’est pas encore
  installée dans l’application : l’intégrer localement, avec sa licence,
  lors du lot de code autorisé. Aucun chargement de police depuis un CDN
  au fonctionnement de l’application.
- **Conserver le bleu nuit et le cyan vif d’origine** : fond `#0e141b`,
  accent `#4fc3e8`. La variante graphite/cyan pastel a été rejetée.
  Le sens vert/orange/rouge reste inchangé. Les couleurs de texte des
  états doivent néanmoins être vérifiées pour leur contraste.
- **La grande silhouette et ses huit zones sont centrales.** La première
  proposition réduisait le corps au profit d’un grand titre : David préfère
  conserver le corps visible d’un coup d’œil. Garder les améliorations de
  typographie, de vocabulaire et de date des mesures.
- Plus de caractère, d’icônes métier et de profondeur visuelle, **avec
  retenue**. David confie cette finition à Fable. Les images fournies sont
  une direction à améliorer, pas une spécification à copier au pixel.
- Une action principale lisible, des sources et dates compréhensibles,
  des explications secondaires accessibles. Ne pas cacher une alerte,
  un état sans données ou une synchronisation en attente.

Le bilan en trois étapes (ressenti → mesures → revue), la disposition des
autres écrans, les icônes précises et les surfaces restent des propositions
à finaliser dans le lot autorisé. Le monogramme H des maquettes n’est pas
un logo validé. La mascotte est facultative et non retenue pour cette passe.

## Le design system : une base à terminer

Conserver `packages/ui` comme point commun aux deux applications. Il existe
déjà des couleurs et espacements partagés, Button, Panel, StatusBadge,
SilhouetteBody et une famille SVG dans `packages/ui/src/icons.tsx`.
Pas de migration de bibliothèque UI, de Tailwind ou de nouvel outil de
design imposé pour cette finition.

Le travail concret est dans l’audit : contrastes de petits textes,
états de boutons, navigation active annoncée aux lecteurs d’écran,
alignement des champs et cohérence entre pages. Les styles en ligne ne
sont pas un défaut en soi ; les valeurs et comportements divergents le
sont. Une petite galerie locale des composants et de leurs états peut
servir à la revue ; installer Storybook n’est pas un préalable.

### Nos icônes, dans la famille existante

Compléter les SVG natifs, même grille 20 × 20, trait 1,6 et bouts arrondis.
Priorité à sept repères : brassard de tension, cœur/pouls, glycémie,
thermomètre, balance, sommeil, exercice. Réutiliser l’horloge ou la compléter
pour le test de réaction si nécessaire.

- Un brassard peut identifier le groupe tension ; les deux champs gardent
  leurs libellés systolique/diastolique et leur unité.
- Une goutte seule ne distingue pas tension, pouls et glycémie. Préférer
  un symbole lié à l’instrument et garder le texte.
- Les icônes accompagnent les libellés, elles ne les remplacent pas.
  Vérifier le dessin à 16, 20 et 24 px, pas seulement en grand.
- Les icônes décoratives sont ignorées par les lecteurs d’écran ; un
  bouton sans texte a un nom accessible. Ne pas réinventer retour,
  fermer ou réglages avec des symboles spatiaux ambigus.

### Du relief sans encombrement

Créer une hiérarchie entre le cadre de la station, la zone de travail et
le détail sélectionné : surfaces existantes mieux séparées, bordure ou
ombre discrète quand elle explique une superposition, sélection localisée
et transition courte. Vérifier le mode de réduction des animations.

Concentrer le caractère sur le corps interactif, le trajet du rapport vers
la Terre et l’évolution du stock après une action. Une zone sélectionnée
peut faire apparaître ses mesures à proximité ; le support exact doit
rester pratique au doigt et au clavier.

Pas de fond spatial animé, particules, halos, verre, faux câblage, son,
parallaxe ou 3D permanente. Ne pas ajouter un score de santé, des récompenses
pour de « bons » résultats, un chatbot ou un module médical pour donner
du caractère. Le chargement, la réussite d’un enregistrement et un niveau
de santé sont trois choses différentes.

## Ordre de travail proposé

| Lot | Résultat attendu | Limite |
|---|---|---|
| 1. Fondations | Police locale, icônes de mesures, contrastes, boutons et navigation cohérents | Garder l’architecture partagée et les couleurs de marque |
| 2. Parcours santé | Accueil avec grand corps ; bilan guidé ; test et interruption compréhensibles | Faire évoluer les composants existants ; aucune nouvelle règle de santé |
| 3. Pages utiles à la démo | Historique, repas, réserve, équipage, alertes et Terre | Réutiliser les fonctions et données existantes ; les listes longues peuvent défiler |
| 4. Finition secondaire | Profil, réglages, calibration et simulateur | Harmonisation légère si les parcours principaux et la répétition sont prêts |

Avant le code, présenter le lot choisi en 3–5 lignes selon AGENTS.md.
La démo visée reste **5 minutes de présentation, puis environ 4 minutes
de questions**. Préserver le temps de répétition sur le matériel réel.

### Points à ne pas perdre dans le parcours

- **Bilan :** réutiliser humeur, symptômes, sommeil et mesures actuels.
  Ne pas créer un deuxième questionnaire. Retour arrière sans perte,
  unités visibles, aide associée au bon champ, aucune ancienne valeur
  préremplie comme une nouvelle mesure. La troisième étape de revue,
  les erreurs et l’état enregistré ne sont pas encore maquettés.
  L’API actuelle reçoit une liste de symptômes : vérifier le sens de
  « non répondu » avant de promettre qu’il est distinct de « aucun ».
- **Réaction :** le protocole actuel reste **3 essais d’entraînement +
  15 mesurés**. Une version plus courte a été évoquée, pas décidée.
  Ne pas modifier la durée, le moteur, la référence ou les couleurs.
  Renommer « paused » en « interrupted » lorsque reprendre est impossible.
  Action principale : recommencer depuis l’entraînement ; retour vers le
  vrai écran d’origine. Conserver les essais bruts, la sauvegarde locale,
  la synchronisation et la séparation des protocoles/appareils/sources.
- **Repas :** distinguer une estimation de besoin et une consommation
  enregistrée. Corriger le texte qui attribue encore une boîte manquante
  à la personne ayant enregistré un repas : cette attribution a été retirée
  par D8. Préserver toutes les denrées disponibles et la gestion des erreurs.
- **Réserve :** photographie, résultat, incertitudes et correction manuelle
  forment le parcours. Les 412 jours des images sont une estimation du jeu
  de démo, avec 212 rations par boîte ; ne pas les traiter comme une preuve
  scientifique. Préserver les noms des produits, la photo entière accessible,
  les douze cases et les options caméra. La miniature de la maquette est
  recadrée pour l’aperçu, pas pour lire ou calibrer le stock.
- **Historique :** dates, unités, origine et valeur courante du filtre
  visibles. Conserver tous les indicateurs existants : la maquette n’en
  dessine qu’un. Les anciennes mesures de réaction restent distinctes des
  nouvelles sessions.
- **Station :** l’équipage et les silhouettes restent utiles. Distinguer
  « aucune alerte », « bilan non fait aujourd’hui » et « données trop anciennes ».
  Les cartes nominales des images représentent seulement le jeu de démo ;
  coder aussi orange, rouge, manquant et périmé.
- **Terre/alertes :** ne plus écrire que tout niveau rouge crée un rapport.
  Appliquer le texte de D7, sans changer ses seuils. Afficher clairement
  le caractère simulé, la progression et l’état réel du message. Les images
  actuelles montrent l’état vide ; elles ne couvrent pas toute la transmission.

## Skills et outils

Lire les skills partagés du dépôt, sans dépendre des chemins personnels
de David : [hestia-context](../../../.agents/skills/hestia-context/SKILL.md),
[hestia-development](../../../.agents/skills/hestia-development/SKILL.md),
[hestia-verification](../../../.agents/skills/hestia-verification/SKILL.md),
[hestia-ui-polish](../../../.agents/skills/hestia-ui-polish/SKILL.md) et
[hestia-ux-research](../../../.agents/skills/hestia-ux-research/SKILL.md).
Les deux derniers adaptent déjà anti-vibecode et human-brain-ux.

Pour la composition, utiliser frontend-design si disponible, ou lire sa
[source officielle](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md).
Il était installé chez David pour MathsManager ; cela ne prouve pas son
activation dans HESTIA ni chez Massi. Aucun plugin n’a été installé pour
cette passation. Aucune installation n’est nécessaire pour lire la galerie.

**Écart connu :** hestia-ui-polish indique encore Plex Sans dans sa direction
fixe. Le choix utilisateur Space Grotesk, consigné en D16, est prioritaire.
Synchroniser cette ligne lors du lot autorisé, sans remplacer le skill.

## Vérification et livraison

Les contrôles du lot réaction sont consignés dans STATUS.md : 69 tests
backend, 10 tests frontend, deux compilations et les parcours navigateur.
Ils n’ont pas été relancés pour cette passation documentaire.

Pour les maquettes : polices réellement chargées dans Chrome, écrans de
téléphone 390 × 844, contrôle de largeur à 360 × 780, station 1280 × 800.
Les boutons des images ne sont pas reliés à l’application. Ni l’ergonomie
auprès d’un astronaute, ni le téléphone physique, ni la caméra réelle ne
sont validés par ces images.

À la livraison du code : vérifier les interactions, le retour arrière,
les données absentes/périmées, les états d’erreur et de sauvegarde, le
clavier, le tactile, le contraste et les animations réduites. Vérifier
un exemple critique et la liaison Terre sur une base jetable. Garder
les limites médicales et les mentions SIMULATED visibles. Lancer les
contrôles pertinents de development.md et hestia-verification, dont
`make check-offline` après ajout des polices.

Mettre à jour STATUS.md et decisions.md avec ce qui a réellement été fait.
Pas de commit sans validation de son message exact ; pas de push, merge,
déploiement ou communication externe implicite. Le journal de blessure,
les photos médicales et le questionnaire supplémentaire restent hors de
ce lot.
