# Revue du design system — 14 novembre 2026

Revue de code et d’écrans par Astra pour la
[passation à Fable](../prompt/2026-11-14-fable-ui-handoff-fr.md).
Ce document décrit la branche locale feat/reaction-protocol, HEAD 5ff5ef3,
avec son lot réaction non committé. Aucune correction UI n’est faite ici.

## Verdict

**Bonne base partagée, finition incomplète.** Il n’est pas nécessaire de
remplacer la bibliothèque de composants. Il faut terminer les rôles de
couleur, les états interactifs et la cohérence des formulaires.

Déjà présents : tokens de couleurs/espacements/rayons, deux familles de
polices locales, Button/Panel/StatusBadge, une famille SVG homogène,
focus clavier global et prise en compte de la réduction des animations
dans SilhouetteBody et ReadoutNumber. StatusBadge combine couleur,
symbole et texte. Ces acquis sont à préserver.

## Constats et actions

| Priorité | Constat vérifié | Action proposée |
|---|---|---|
| Haute | Les petits textes text-faint sont utilisés pour des unités, dates et liens de navigation utiles | Définir un rôle de texte secondaire suffisamment contrasté ; garder les teintes faibles pour le décor |
| Haute | Le vert et le rouge des petits badges, sur leur fond teinté, ne passent pas le contraste de texte normal dans le cas calculé ci-dessous | Distinguer la couleur d’encre et celle de surface d’un statut ; conserver son sens et son libellé |
| Haute | TabBar et NavRail indiquent l’onglet actif visuellement, sans aria-current ou aria-selected | Annoncer la page active, avec une sémantique de navigation appropriée |
| Moyenne | Button partage les variantes, mais pas d’état de chargement ni de styles communs de survol/appui ; pas de hauteur tactile minimum explicite | Définir ces états une fois, garder le focus visible et le libellé de l’action pendant le chargement |
| Moyenne | Button utilise un gap de 7 px et plusieurs paddings propres ; Panel utilise 11 px ; les pages ajoutent beaucoup d’ajustements | Harmoniser les valeurs récurrentes avec les tokens, sans interdire arbitrairement les styles en ligne |
| Moyenne | FieldRow n’a pas de repère métier ; ses unités et dernières valeurs emploient text-faint | Ajouter des icônes de mesures dans la famille existante, garder labels/unités et ajouter le contexte temporel utile |
| Moyenne | Les états vides, interruption, absence de données et sauvegarde sont présentés différemment selon l’écran | Partager les principes de contenu et les composants récurrents, sans confondre état de santé et état d’enregistrement |
| À finaliser | La direction visuelle actuelle est plate ; plusieurs cartes ont le même poids | Distinguer les surfaces et la sélection, concentrer le caractère sur le corps et les événements utiles |

Fichiers examinés :
[tokens.css](../../packages/ui/src/styles/tokens.css),
[Button](../../packages/ui/src/components/Button.tsx),
[Panel](../../packages/ui/src/components/Panel.tsx),
[TabBar](../../packages/ui/src/components/TabBar.tsx),
[NavRail](../../packages/ui/src/components/NavRail.tsx),
[StatusBadge](../../packages/ui/src/components/StatusBadge.tsx),
[icons.tsx](../../packages/ui/src/icons.tsx) et
[FieldRow](../../apps/crew/src/components/FieldRow.tsx).

### Contrastes calculés depuis les couleurs du code

Le cas des badges suppose leur fond translucide à 16 % sur le panneau
#161d27. Un autre parent peut donner un autre résultat. Les calculs portent
sur les couleurs déclarées, pas sur des pixels anticrénelés d’une image.

| Texte / fond | Rapport calculé |
|---|---:|
| text-faint #5c6673 sur panel #161d27 | 2,908:1 |
| text-faint #5c6673 sur bg #0e141b | 3,176:1 |
| green #0ca30c sur green-dim composité sur panel | 4,123:1 |
| red #d03b3b sur red-dim composité sur panel | 3,111:1 |
| orange #fab219 sur orange-dim composité sur panel | 6,673:1 |

Le seuil WCAG AA du texte normal est 4,5:1, avec les exceptions précisées
par le [W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Un onglet non sélectionné reste une commande utilisable : ce n’est pas
automatiquement un contrôle désactivé exempté. Le commentaire de tokens.css
sur la palette dataviz ne constitue pas une vérification de ces usages texte.

Pour le tactile, 44 px est un objectif de confort proposé, pas le seuil AA
universel. WCAG 2.2 AA prévoit 24 × 24 px ou des exceptions d’espacement :
[Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Mesurer les contrôles rendus avant d’annoncer leur conformité.

## Deux textes contredisent le comportement documenté

- [Meal.tsx](../../apps/crew/src/screens/Meal.tsx), dernière explication :
  annonce encore que la boîte manquante au scan est attribuée à la personne.
  D8 a supprimé cette attribution. Corriger le texte, pas réintroduire la règle.
- [AlertsScreen.tsx](../../apps/station/src/screens/AlertsScreen.tsx) et
  [EarthScreen.tsx](../../apps/station/src/screens/EarthScreen.tsx) annoncent
  trop largement qu’une alerte rouge crée un rapport. D7 définit des
  conditions d’escalade plus précises. Garder les seuils dans les règles,
  ne pas en inventer dans les composants.

Le flux proposé « questions facultatives » demande aussi une vérification
de contrat : Checkin.tsx envoie symptoms comme une liste et le modèle de
requête la remplit par défaut. Ce relevé ne démontre pas la distinction
entre question ignorée et absence de symptôme. Ne pas la promettre avant
de l’avoir spécifiée et vérifiée.

## Icônes et profondeur : travail ciblé

Les pictogrammes du dépôt sont déjà des SVG natifs, grille 20 × 20,
trait 1,6, angles et extrémités arrondis. Étendre cette famille pour les
mesures plutôt qu’ajouter plusieurs packs. L’icône d’un brassard identifie
le groupe tension ; le texte identifie les deux valeurs. Conserver les
unités, l’aide et les noms accessibles. L’effet sur la compréhension reste
une hypothèse à tester avec David et Massi.

Pour la profondeur : fond de station, surface de travail, détail sélectionné.
Une ombre neutre discrète ou une différence de surface peut exprimer ce qui
est devant ; elle doit servir un niveau ou une interaction. Garder la
grande silhouette, ses huit zones, et un retour visuel sur la zone choisie.
Pas de modification des couleurs médicales ou de fausse jauge physiologique.

## Limites de la revue

Les sources et plusieurs écrans actuels ont été examinés. Les prototypes
ont été rendus dans Chrome avec les vraies polices : 390 × 844 et contrôle
de largeur à 360 × 780 pour le téléphone, 1280 × 800 pour la station.
Certaines pages mobiles défilent verticalement. Les images ne prouvent pas
le fonctionnement de leurs boutons, une validation UX ou une conformité
d’accessibilité complète. Pas de lecteur d’écran, appareil réel ou caméra
testé dans cette passe. Les tests backend et frontend antérieurs restent
ceux de STATUS.md, non relancés pour ces documents.

Les instructions de composition de
[frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
et les skills du dépôt sont des méthodes de travail, pas une preuve que le
nouveau parcours sera plus intuitif. Le contrôle utile après intégration :
faire commencer un bilan, retrouver une mesure datée et reprendre un test
interrompu sans guider verbalement la personne.
