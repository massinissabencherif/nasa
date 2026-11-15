# Fable — prochaine passe vision et démonstration

**15 novembre 2026 · David confirme l'attribution de la vision à Claude.**
Son dernier retour propose un worktree séparé ; sa création n'a pas été vérifiée
par Astra. Codex garde les composants et interfaces dans le dossier actuel.

**Travail simultané :** ne pas changer la branche ni les fichiers UI du dossier
Codex. Un worktree part de HEAD et ne récupère pas les changements non commités :
lire ce brief et la passation depuis le dossier d'origine. Utiliser une base
jetable et un port propres, sans reset des bases de Codex ni occupation de
8010/8011/1422. Garder les preuves vision dans ton worktree ; l'intégration et
les documents communs seront rapprochés ensuite. Aucun envoi externe par Astra.
Périmètre proposé : fiabilité des scans Ollama et preuve de démonstration.
Ce document n'autorise aucun commit, publication, installation de modèle ni
réinitialisation de données. Appliquer `AGENTS.md` et faire valider le plan d'édition.

## Reprendre sans perdre le travail

Lire `AGENTS.md`, `hestia/docs/README.md`, `STATUS.md`, `decisions.md`, puis
`sources/2026-11-15-interactions-and-evidence.md` et `vision-benchmark.md`.
Utiliser les skills partagés hestia-context/development/verification.
La passe Astra est sur `fix/mobile-interactions`, basée sur `0fb3cd3`, encore
non commitée au moment de cette rédaction. Vérifier l'état réel au démarrage ;
ne pas écraser l'arbre de travail et ne pas repartir d'une ancienne branche.

L'interface vient d'être vérifiée : loader simple et erreurs explicites, cerveau
rempli, yeux alignés, muscles bras/cuisses, cœur continu avec pause et garde de
visibilité, sélection bleue rétablie partout, langue persistée et aides réécrites.
Ne pas relancer une refonte visuelle. Les suites encore ouvertes sont dans le
registre, notamment identité de la mascotte et fin de traduction/composants.

## Ce qui est prouvé pour Ollama

Sur le Mac M1 Pro de David : Ollama 0.40.15 et qwen2.5vl:7b (~6 Go) fonctionnent
en local. Les appels réels au pipeline puis à l'API et les corrections manuelles
ont été vérifiés sur une base jetable. Pas de panne de connexion lors de ces scans.

| Image générée | Image entière | Trois découpes par rangée |
|---|---|---|
| Étagère pleine | 11/12, 21,52 s | 11/12, 33,02 s |
| A1 vide après retrait | 10/12, 13,55 s | 11/12, 14,08 s |

A3 contient **quatre** boîtes empilées et est lu **deux** dans ces essais. Le mode
image entière invente une boîte en A1 vide, sans avertissement. Le score interne
de plausibilité n'est pas une probabilité d'exactitude. La cause exacte n'a pas
été isolée : ne pas la présenter comme un problème certain de prompt, de modèle,
de calibration ou d'éclairage avant comparaison.

Attention : un ancien script d'Astra attendait A1=2 au lieu de **0** sur l'image
après retrait. Ce score a été corrigé après inspection de l'image ; le modèle
n'a pas été amélioré. Sorties brutes et corrigées : `docs/design/2026-11-15/`.
Le script `scripts/verify_vision_fixtures.py` a sa syntaxe vérifiée ; sa version
rangée dans le dépôt n'a pas été réexécutée. Les sorties proviennent des appels
équivalents précédents. Pas de tests caméra/étagère réelle/vidéo sur cette passe.

## Travail proposé, dans cet ordre

**Précision demandée par David : liste des aliments et repas.** Vérifier aussi
la chaîne photo → comptes par case → inventaire enregistré → aliments proposés
dans Repas → portions consommées. Aujourd'hui, le prompt fournit déjà le nom de
l'aliment attendu dans chaque case (`vision/pipeline.py::_describe`), et le
modèle renvoie seulement les nombres. Le catalogue et les valeurs nutritionnelles
sont préconfigurés ; les repas ne viennent pas d'une reconnaissance ouverte.
Un scan n'est pas un repas consommé. Les quantités non relues restent estimées.
Inclure un cas vide, un retrait et une correction, puis vérifier la liste et les
quantités de Repas. Reconnaître des aliments inconnus ou déplacés est une évolution
distincte à proposer après les tests de comptage, sans inventer leurs nutriments.
Le lien nutrition/caméra est notre choix produit, pas une exigence d'utiliser
Ollama : voir la lecture du défi consignée dans `docs/product.md`. La page
officielle a renvoyé une erreur 502 lors de cette nouvelle tentative de lecture.

1. Reproduire les deux images avec leur vérité terrain vérifiée, conserver les
   sorties brutes, le modèle/digest, les paramètres et les durées. Distinguer
   démarrage à froid et modèle déjà chargé ; répéter pour mesurer la variabilité.
2. Inspecter A1/A3 et les découpes réellement envoyées au modèle. Comparer une
   seule modification à la fois : cadrage/résolution, prompt, puis stratégie.
   Ne jamais coder les comptes attendus des fixtures dans le moteur.
3. Avec David/Massi, constituer quelques **vraies photos** comptées à la main :
   case vide, pile, retrait d'une boîte, plusieurs angles/éclairages. Réserver
   des photos qui n'ont pas servi aux réglages. Aucun résultat généré ne remplace
   ces essais ; ne pas envoyer les photos à un service externe sans accord.
4. Une fois les photos fiables, examiner la vidéo/caméra : lecture d'une image
   choisie, fréquence de capture, absence de scans concurrents, durée et correction
   manuelle. Ne pas lancer des appels au modèle sur chaque image vidéo.
5. Produire un verdict honnête : exactitude par case, faux objets dans une case
   vide, boîtes manquées, erreurs signalées ou silencieuses, durée et variabilité.
   Si ce n'est pas fiable, conserver la vérification humaine obligatoire et un
   scénario de secours annoncé comme simulé.

## Scénarios pour la présentation

Ils existent déjà : station → réglages → commandes de démo ; backend
`server/app/routes/demo.py`. `low-exercise`, `red-alert`, `shelf-removal` passent
par les moteurs existants ; `demo-mars` remet les données de départ et efface
les enregistrements. Ne le lancer que sur une base jetable dédiée, jamais sur
`server/hestia.db` sans accord explicite. Reprendre ces contrôles pour le pitch
de 5 minutes et environ 4 minutes de questions, avant d'ajouter un générateur.

## Livrable attendu

Un rapport court avec preuves, résultats avant/après sur les mêmes images et
sur les photos réservées, limites et recommandation pour la démo. Mise à jour
de STATUS/decisions/vision-benchmark. Aucun chiffre d'amélioration sans exécution.
Faire approuver le message exact avant commit, puis obtenir l'accord pour push
ou fusion ; toute communication externe demande son texte exact validé.
