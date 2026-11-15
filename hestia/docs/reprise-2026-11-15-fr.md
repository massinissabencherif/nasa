# Reprise du 15 novembre — David et Massi

**À lire en premier après la livraison de la nuit sur `main`.** Cette passation
permet de reprendre sans attendre que l'autre soit disponible. Les sujets sont
ouverts : Massi et David choisissent chacun ce qu'ils veulent prendre.
Les anciennes mentions « uncommitted », branches et PID dans les rapports
décrivent les étapes précédentes ; vérifier la branche et le commit actuels avec Git.

## Choisir un sujet et éviter de se marcher dessus

| Sujet disponible | Pourquoi le prendre | Résultat attendu |
|---|---|---|
| Finitions des écrans | Des retours sont encore ouverts ; liste concrète plus bas | Un petit lot cohérent, vérifié dans le navigateur |
| Répétition avec le matériel et les produits | Les essais automatisés ne prouvent pas le fonctionnement sur place | Parcours réel, erreurs reproductibles, durée et solution de secours |
| Liaison Terre et simulateur | Parcours complet encore à répéter et explication à clarifier | Démonstration compréhensible des délais et hypothèses |
| Dossier de présentation | Les brouillons NASA/pitch/risques contiennent d'anciennes informations | Textes conformes aux fonctions actuelles, sources et médias à fournir identifiés |
| Fiabilité vision ou autre défaut reproduit | Le modèle peut encore se tromper | Correction ciblée et mesure sur de nouvelles photos, sans promesse de précision générale |

**Aucun de ces sujets n'est attribué ou réservé.** Massi peut prendre une retouche
frontend, la présentation ou un autre sujet utile. Avant de commencer, noter dans
`STATUS.md` le sujet choisi, la branche et les fichiers concernés. Au réveil,
l'autre peut voir ce qui est en cours et prendre un lot distinct.

## Récupérer et lancer

Dans **ton propre clone** de `massinissabencherif/nasa`, vérifier d'abord
`git status`. Si tu as des changements, les conserver et les examiner ; ne pas
faire de reset, de nettoyage ou d'écrasement automatique.

Avec un dossier propre, après confirmation de publication :

```bash
git fetch origin
git switch main
git pull --ff-only
git log -1 --oneline
cd hestia
make install
```

Pour modifier le projet, créer ensuite une branche portant le nom du sujet
choisi, depuis cette version à jour de `main`.

Prévoir Node 22+, pnpm 10+, Python 3.12 et uv. Installation en ligne une fois.
Pour la vraie lecture d'images : Ollama et le modèle local `qwen2.5vl:7b`.
Un rejeu de démo fonctionne sans le modèle ; il faut l'annoncer comme un rejeu.
Ne pas installer Xcode pour cette répétition.

Lancement simple **sans Rust ni application native**, deux terminaux dans `hestia/` :

```bash
# Terminal 1 : API + application équipage compilée
make server
```

```bash
# Terminal 2 : interface station dans le navigateur
make station-web
```

- Station : <http://localhost:1420> ; équipage : <http://localhost:8000/crew/>.
- Pour essayer avec une base jetable : `HESTIA_DB_PATH=/tmp/hestia-massi-rehearsal.db make server`.
  Ce fichier sera conservé entre deux lancements ; pas de reset nécessaire après un pull.
- Si un port est déjà occupé, identifier le processus avant d'agir ; ne pas tuer
  tous les serveurs du Mac. Les ports sont configurables, voir [development.md](development.md).
- Le lancement normal écoute sur le réseau local. Le téléphone doit joindre
  l'adresse du Mac, jamais `localhost`. Réglages → Mission et téléphones donne le lien/QR.
- Le viseur caméra du navigateur demande un contexte sécurisé : localhost sur
  le Mac, ou HTTPS sur le téléphone. Le serveur prévoit un certificat local ;
  permissions et acceptation sur le vrai téléphone restent à vérifier.
  Si le viseur échoue, importer une photo prise avec l'appareil photo du téléphone.
- Tester le réseau choisi. Le Wi-Fi de l'école peut isoler ses utilisateurs ;
  le QR ne contourne pas cette restriction. Un réseau local dédié est le repli.
  Internet n'est pas nécessaire une fois les dépendances et le modèle installés.

Sur le Mac de David seulement, les aperçus précédents sont station `1422` et
API/équipage `8011`, avec une base jetable séparée. **8011 écoute seulement sur
localhost** : ce n'est pas le serveur à faire scanner au jury. Conserver cette
base et les services existants si David souhaite retrouver son état.

## Répétition minimale, dans cet ordre

1. **Bilan** : choisir un profil fictif, enregistrer un bilan et retrouver la
   mesure sur la station. Vérifier le comportement si le téléphone perd le
   réseau. Les bilans ordinaires ne disposent pas d'une file locale hors ligne.
2. **Réserve réelle** : préparer 2–3 types de produits, lire leurs étiquettes,
   puis Réglages → Outils de présentation → Préparer mes produits. Les valeurs
   sont par emballage entier. On peut modifier les produits ou en ajouter :
   pas besoin d'acheter exactement ceux du catalogue de démonstration.
3. **Photo et comptage** : un type de produit par case, éventuellement plusieurs
   emballages identiques. Choisir les dimensions (1–3 rangées, 1–4 colonnes),
   cadrer, vérifier les attributions locales A1/A2/B1… puis analyser.
   Comparer au vrai nombre, corriger, confirmer et enregistrer. Retirer un
   emballage et recommencer. Noter le mode, la durée et les erreurs, même quand
   la lecture approfondie donne un bon résultat.
4. **Quantités et projection** : ×1 pour le bac réel ; ×212 ou une autre valeur
   pour une projection explicitement simulée. Trois haricots du catalogue à
   250 kcal et deux eaux donnent 750 kcal avant multiplication, pas 159 000 kcal
   physiques. Le catalogue initial contient des estimations de démo.
5. **Repas** : enregistrer une consommation et vérifier son effet sur les
   portions disponibles. Éditer ensuite les valeurs d'un produit recalculerait
   aussi les anciens repas liés à ce produit ; ne pas le faire par surprise.
6. **Liaison Terre** : sur la base de répétition, jouer le scénario de Sofia
   dans les outils de présentation ; suivre l'alerte, le rapport en attente,
   l'arrivée et la réponse simulée. Essayer l'accélération/avance et expliquer
   le délai. Cela ne contacte ni la NASA ni un médecin.
7. **Réaction, si utile au pitch** : 1 entraînement + 5 essais mesurés ; essayer
   au vrai toucher et vérifier l'enregistrement. Les nouveaux résultats ne
   changent pas les couleurs médicales. Ce test n'est pas validé cliniquement.
8. **Présentation complète** : 5 minutes puis environ 4 minutes de questions.
   Chronométrer avec la vraie caméra ; préparer le rejeu et la vue téléphone
   dans le navigateur du Mac si le matériel ou le réseau manque.

Une photo partielle conserve les autres cases. « Toute ma nouvelle réserve »
met à zéro les cases non photographiées **au moment de l'enregistrement**.
Changer les dimensions ne réattribue pas les produits. Plusieurs cases du même
produit sont autorisées ; recompter les anciennes cases si les mêmes paquets ont
simplement été déplacés. « Partir d'un stock vide » garde le catalogue et les
bilans ; **« Remettre la démo à zéro » / `make reset` remplace les données**.

## Ce que l'on peut affirmer aujourd'hui

- Le logiciel calcule localement. Le modèle compte des produits **attribués
  par une personne**, il ne reconnaît pas librement n'importe quel aliment et
  n'en déduit pas sa nutrition. Une validation humaine précède l'enregistrement.
- La caméra montre un viseur ; l'analyse est déclenchée par photo. La caméra
  fixe à captures périodiques est une évolution envisagée, pas une fonction livrée.
- Les données d'équipage et les réponses Terre sont simulées. Les références
  NASA sont des sources scientifiques, pas un flux médical d'astronautes réels.
- Les règles de couleur et d'escalade sont indicatives. Les validations humaines
  encore ouvertes sont dans [decisions.md](decisions.md), notamment D6–D8.

**Vérifié sur le Mac de David :** 92 tests backend puis 4 nouveaux tests de
régression passés ; les 23 tests frontend avaient passé avant les derniers lots
catalogue/mouvement. Les deux applications compilent après le dernier changement.
Des parcours Chrome ciblés couvrent cadrage, confirmation, échec/reprise, clavier,
animations réduites et écrans étroits. Les derniers scénarios navigateur
interceptaient les écritures/lectures IA. Lint : aucune erreur, 10 avertissements.

**Non vérifié :** vrai téléphone, caméra physique et nouveaux produits, réseau
du lieu, machine de Massi, version native, présentation complète chronométrée.
La lecture approfondie a obtenu 12/12 sur chacune de deux images ayant servi
au réglage ; ce n'est pas une mesure de fiabilité sur de nouvelles photos.
David a aussi observé une erreur sur le riz, puis de bons résultats récents sans
comptage statistique. [Preuves et captures](design/2026-11-15/README.md).

## Liste des retouches à reprendre, au choix

Les composants, aides, illustrations, icônes et animations existent déjà : cette
liste concerne leur finition, pas leur reconstruction. Le [registre détaillé](sources/2026-11-15-interactions-and-evidence.md#next-work-in-order)
conserve les demandes, les réalisations et leurs limites.

| Écran ou thème | Retouche / vérification encore utile |
|---|---|
| Résultat du test de réaction | Dernier retour : écran peu convaincant, informations trop denses ; mettre en évidence la médiane et sa signification, simplifier la comparaison personnelle, traduire « Building your personal reference », améliorer le graphique et l'accès aux résultats |
| Textes et graphiques | Terminer les textes dynamiques FR/EN ; titres, unités, dates et origine des valeurs compréhensibles ; choisir tableau/barres/courbe selon la donnée, sans ajouter de camembert décoratif |
| Bilan, accueil et historique équipage | Vérifier que l'action et les résultats se trouvent immédiatement, que les aides restent courtes et que le parcours reste clair sur un vrai téléphone |
| Repas et réserve | Vérifier le parcours avec les vrais produits, la confirmation du repas, les quantités, le cadrage et les attributions ; distinguer clairement bac photographié et projection de mission |
| Réglages | Dernière passe de compréhension : mission, connexion des téléphones, outils de présentation, multiplicateur et IA locale ; éviter les formulations compréhensibles seulement par les développeurs |
| Liaison Terre et simulateur | Après essai complet, améliorer si nécessaire la hiérarchie et les explications : que fait l'action, quelles données/hypothèses utilise-t-elle, qu'est-ce qui reste simulé ? |
| Composants et accessibilité | Finir les contrôles encore disparates, unités, erreurs et confirmations ; cohérence du clavier, du focus, des aides et des fenêtres. Garder les bottom sheets sans trait cyan supérieur |
| Animation | Harmoniser les entrées/sorties utiles avec les styles partagés ; vérifier mouvements réduits, pause et arrêt hors écran. Garder les loaders simples et ne pas ajouter d'animation qui ralentit la tâche |
| Mascotte et accueil du jury | Le compagnon et le guide sont présents ; personnalité/nom/poses et petit onboarding facultatif restent à décider. Pas besoin de remplir les espaces avec la mascotte |
| Petits écrans / qualité technique | Vérifier téléphone réel, paysage et tablette ; l'admin sous 768 px oriente déjà vers l'app équipage. Restent aussi 10 avertissements lint et le poids des fichiers JS/images |

Choix déjà validés à conserver comme base : police Space Grotesk, chiffres Plex
Mono, palette marine/cyan vive, silhouette bien visible et fond discret actuel.
Les favicons, crédits David/Massi et marques ESGI/Space Apps sont présents.
Le questionnaire supplémentaire, le journal de blessures/photos et la capture
automatique périodique restent des évolutions, pas des urgences de finition.

Les brouillons [NASA](nasa-project-page.md), [pitch](demo-script.md) et
[risques](risks.md) contiennent encore des informations anciennes : durée du
test, grille, mode de lecture, compte de tests, autonomie et réseau. **Ne pas
les publier ou les réciter tels quels.** La personne qui prend ce sujet les
réconcilie avec le code ; l'équipe choisit le support final et valide la soumission.

## Reprendre avec Fable, si utile

**Aucune mission de développement n'est attribuée à Fable pour l'instant.**
Un [court message de reprise du contexte](prompt/2026-11-15-fable-final-readiness-fr.md)
est disponible si David ouvre Claude vers 6 h 40 ; le sujet concret sera choisi
ensuite. Aucun message ni lancement automatique n'a été effectué.

Pour éviter les collisions : un clone/dossier de travail Git et une branche par
personne. Fable ne reprend pas aveuglément l'ancien dossier vision, basé sur
une version antérieure ; ses changements utiles ont déjà été intégrés au lot.
Chaque agent lit `AGENTS.md` et annonce ses fichiers. Le message exact de chaque
nouveau commit, puis toute publication, doivent être validés par son utilisateur.
