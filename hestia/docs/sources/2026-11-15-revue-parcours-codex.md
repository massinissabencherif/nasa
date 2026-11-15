# Revue des parcours HESTIA — Codex, 15 novembre 2026

## Verdict pour David et Massi

**Les parcours principaux fonctionnent sur la machine de David, avec des données
jetables. On peut arrêter les ajouts et préparer la présentation.** Cette revue
ne certifie ni le matériel réel ni une validation médicale.

Cinq incohérences sont confirmées ci-dessous. Le risque de comptage et de durée
Ollama impose en plus une vérification humaine et un repli explicite. Rien n’a été
corrigé dans le code pendant cet audit initial. Le lot correctif autorisé ensuite
est documenté dans l’addendum en fin de fichier ; les observations originales
sont conservées.

## Version, isolation et méthode

Départ sur `a3850b9`. Le commit `8ed3edf` est arrivé pendant la revue : ajout du
jus d’orange au catalogue, raccourcis de mission/Réserve, styles et traductions.
Les autres fichiers des parcours audités n’ont pas changé. Les derniers contrôles
et la répétition technique utilisent `8ed3edf` côté station. L’API isolée avait
chargé les routes de `a3850b9` ; ces routes ne diffèrent pas dans `8ed3edf`.

- API d’audit : `http://127.0.0.1:8012`, station : `http://127.0.0.1:1432`.
- Base, fixtures copiées, uploads, scripts et captures :
  `/private/tmp/hestia-flow-audit-20261115/`. Les captures d’upload sont redirigées
  vers ce dossier dans le lanceur de test, sans modifier les sources.
- Base de démonstration 8011 et vrais comptes-rendus conservés. Les seuls resets
  et enregistrements de cet audit concernent 8012. Aucun nouveau paquet installé.
- Chrome automatisé : équipage 390×844, station 1280×800, parcours principalement
  en anglais. Les derniers lots avaient aussi vérifié Historique/Repas en FR/EN.
- Les réussites ci-dessous utilisent de vrais appels API, sauf les pannes réseau
  et le rejet photo injectés, identifiés comme tels. La caméra est un périphérique
  de test Chrome ; elle ne remplace pas la caméra physique du Mac ou de l’iPhone.
- Pas de nouvelle exécution des 108 tests serveur/27 tests frontend : ils venaient
  de passer sur le lot publié. Ici, la preuve ajoutée est le parcours navigateur/API.

## Problèmes confirmés, classés pour la présentation

### F1 — stock réaugmenté par le vieux calibrage photo

**Priorité : bloquant si ce chemin est utilisé. Sinon, l’exclure de la démo.**

Reproduction sur base isolée : enregistrer un repas, puis ouvrir
`#/pantry/calibration` et remplacer uniquement la photo de référence. Le POST
`/api/pantry/photo?scan=false` garde les 26 emballages, mais le stock passe de
**3 800 384 à 3 801 584 kcal** ; `pending_meals` passe de 1 à 0. Les 1200 kcal du
repas sont réapparues sans ravitaillement ni changement de quantité.

Cause établie : `server/app/routes/pantry.py:335` crée un nouvel instantané et
recopie les quantités. `server/app/engines/nutrition.py:61` ne soustrait que les
repas postérieurs à cet instantané. L’import de référence efface donc l’effet du
repas dans le calcul, même si son historique existe toujours.

**Effet pour le jury :** deux écrans peuvent annoncer des réserves différentes à
la suite d’un simple changement de photo. **Correctif minimal :** conserver les
déductions lors d’un changement de référence, ou neutraliser ce chemin ancien.
**Contournement immédiat :** utiliser seulement « Nouvelle photo → cadrage →
vérification → enregistrer », qui a été vérifié séparément. La route de calibrage
existe encore, mais n’a plus de lien dans la navigation principale.
**Propriétaire proposé :** personne choisie par David/Massi pour stock/serveur.
**État :** reproduit, non corrigé. Preuve : `api-edge.json`, bloc `reference_photo`.

### F2 — panne de l’historique des simulations présentée comme historique vide

**Priorité : gêne la compréhension ; petite correction utile avant la démo.**

Créer deux rapports, intercepter GET `/api/forecast/reports` avec HTTP 503, puis
ouvrir le simulateur. L’interface annonce « No report yet… » sans erreur ni
réessai, alors que les rapports existent. Cause :
`apps/station/src/screens/ForecastsScreen.tsx:93`, rejet converti en liste vide.

**Effet :** donne l’impression que l’historique a disparu. **Correctif minimal :**
état d’erreur distinct, données précédentes marquées anciennes et bouton de réessai.
**Propriétaire proposé :** Massi, qui possède le simulateur.
**État :** reproduit par panne injectée, non corrigé. Capture :
`finding-simulator-false-empty.png` ; résultat `ui-edge.json`.

### F3 — panne Terre silencieuse

**Priorité : gêne la compréhension ; à traiter avec F2.**

Des rapports existent ; intercepter GET `/api/earth/messages` avec HTTP 503 et
ouvrir Liaison Terre. Seuls le contexte et les commandes d’avance restent
visibles. Aucun message d’erreur ni réessai n’explique l’absence des rapports.
Cause : `apps/station/src/screens/EarthScreen.tsx:201`, erreur ignorée.

**Effet :** l’utilisateur ne sait pas si le rapport est parti, absent ou inaccessible.
**Correctif minimal :** chargement/erreur explicites et réessai, en conservant les
rapports déjà chargés quand le rafraîchissement échoue.
**Propriétaire proposé :** Massi, qui possède Terre.
**État :** reproduit par panne injectée, non corrigé. Capture :
`finding-earth-no-error.png` ; résultat `ui-edge.json`.

### F4 — ancien rapport Mars réétiqueté ISS après changement de mission

**Priorité : gêne la compréhension ; contournable pour le pitch.**

Envoyer un rapport depuis Mars (20 min aller), puis passer la mission active à
ISS. Le même rapport conserve ses dates d’arrivée/réponse et son délai Mars,
mais sa ligne et son illustration deviennent **ISS**, sous un en-tête annonçant
une réponse quasi instantanée. Reproduction : rapport #3, envoyé à 16:02:44,
arrivée à 16:22:44 et réponse à 16:42:44, affiché « ISS · sent 16:02:44 ».

Cause : `apps/station/src/screens/EarthScreen.tsx:301` utilise le contexte actif
pour dessiner les anciens messages. Le contexte d’envoi n’est pas conservé dans
leur payload. Les délais n’ont pas été recalculés : l’incohérence est l’origine
annoncée, pas une erreur du compte à rebours.

**Correctif minimal :** figer le contexte dans le rapport et l’utiliser à l’affichage ;
prévoir un libellé prudent pour les anciens rapports sans cette information.
**Contournement :** garder Mars pendant toute la séquence Terre et ne pas revenir
sur les anciens messages après avoir changé de mission.
**Propriétaire proposé :** Massi/Terre. **État :** reproduit, non corrigé.
Capture : `finding-iss-old-mars-report.png` ; `api-edge.json` et `ui-finish.json`.

### F5 — brouillons de présentation décalés de l’application

**Priorité : bloquant pour ces textes s’ils sont repris tels quels.**

- `docs/demo-script.md:59` annonce encore 3 entraînements + 15 essais ; le
  protocole actuel et le parcours joué sont 1 + 5.
- `docs/nasa-project-page.md:48` répète l’ancien protocole et `:26` dit « no
  network ». Le traitement est local, mais un téléphone séparé a besoin du
  réseau local vers la station.
- Les scripts de vidéo/diapositives et risques gardent d’anciens boutons, temps de
  scan et comptes de tests. Les chiffres 412 → 398 demandent la base de démo ×212,
  pas votre bac réel ×1. L’outil de génération d’images reste à renseigner dans
  la déclaration IA de la fiche NASA.

**Correctif minimal :** réconcilier le texte avec la version répétée et ses vrais
chiffres. **Propriétaire proposé :** Massi/David et l’agent qui prépare le support.
**État :** constat documentaire, non modifié pendant la revue.

## Essai Ollama réel : disponibilité et limite observée

Une seule lecture **simple/full** de `shelf_full.png`, image générée et déjà
connue du projet, a été exécutée via l’API isolée avec `qwen2.5vl:7b`.

- Réponse HTTP 200 en **60,3 s** au total. Le temps éventuel de chargement du modèle
  n’a pas été isolé : ce n’est pas une mesure reproductible de latence à chaud.
- **11 cases concordent sur 12** avec les annotations de cette image ; A3 est
  proposé à **2**, annotation **4**. Toutes les quantités restent à vérifier.
- Une proposition de revue est créée ; le stock reste inchangé. Proposition
  abandonnée après mesure, aucune quantité IA enregistrée.
- Cet unique essai sur une image connue n’est pas un taux de fiabilité général.
  Ni le mode approfondi, ni de nouvelles photos Auchan, ni un bac réel, ni le
  rejet d’un vrai logo n’ont été validés dans cet essai.

**Décision de démo conseillée :** photo réelle uniquement si répétée avec les
produits/éclairage/caméra retenus ; sinon photo importée ou rejeu annoncé « sans
IA ». Le modèle propose, une personne vérifie. Aucun entraînement improvisé.
Preuve : `vision-probe.json`.

## Couverture des 12 parcours

| Parcours | Vérifié dans cette revue | Limite restante |
|---|---|---|
| QR / profil / accueil | Choisir Alex, passer à Priya, bon identifiant actif ; QR photo déjà intégré au lot publié | Vrai téléphone et réseau de salle à répéter ; pas d’essai physique nouveau |
| Bilan | Saisie → retour → vérification → POST 503 injecté → réponses conservées → vrai POST → station affiche 67 bpm ; une seule ligne manuelle créée | Perte Wi-Fi physique et interface Safari non exercées |
| Silhouette | Les huit libellés ouvrent leur fiche et une prochaine action ; fermeture Escape ; statut après bilan cohérent | Pas d’expertise médicale sur les dessins ni d’audit lecteur d’écran complet |
| Réaction | Vrai protocole 1+5 dans le navigateur, entraînement jeté ; timeout mesuré, faux départ, POST refusé puis réessai unique, interruption exclue | Temps automatisés, pas une performance humaine ni une validation du téléphone |
| Historique | Mesures chargées, panne injectée/retry ; correction des mauvaises unités et courses déjà vérifiée dans le lot publié | Texte agrandi et tous les appareils hors priorité |
| Repas | Vrai enregistrement : kcal exactes retirées, emballages inchangés ; erreur partielle déjà testée dans le lot publié | Unité = emballage de catalogue, pas une portion personnalisée ; appels multi-aliments non atomiques |
| Photo / réserve | Rejeu sans IA → revue obligatoire → sauvegarde retire exactement 3 boîtes ; import/cadrage 2×2/attributions/annulation ; caméra factice arrêtée après capture ; refus caméra et erreur photo visibles ; une lecture Ollama réelle | Caméra physique et refus d’une vraie photo hors sujet non validés ; le rejet photo UI a été injecté |
| Réglages / produits / échelle | Modifier produit : annuler conserve valeur, sauver la change ; annuler ×2 ne change rien, sauver ×2 garde les emballages ; stock vide exige confirmation et conserve santé/catalogue/attributions | F1 sur ancien changement de référence |
| Missions | Les quatre sélections concordent avec l’API ; un rapport de simulation sauvegardé reste figé après changement de mission | F4 sur anciens messages Terre |
| Alertes / Terre | Une tension rouge isolée à 140 ne transmet pas ; scénario critique transmet ; cocher plan persiste ; amélioration → aperçu → complément → deux avances 20 min → réponses ; règle « ne pas attendre » déclenchée | F3, F4 ; contenu de certaines réponses/règles encore anglais |
| Simulateur | Cinq étapes confirmées → rapport enregistré → historique → modifier → nouveau rapport ; ancien résultat conservé | F2 ; avertissements détaillés derrière compteurs : arbitrage connu de Massi, pas corrigé |
| Guide / aides / sources | Quatre thèmes du Guide ouverts, fermeture et retour à la tâche ; limites/source du produit lisibles dans les écrans | Pas de nouvel audit scientifique des publications ; F5 sur supports externes |

Les états inconnus, champs vides et anciennes sessions de réaction ne deviennent
pas automatiquement normaux/comparables. Les vérifications détaillées de ces
états restent dans les preuves des lots publiés ; tout n’a pas été rejoué à l’identique.

## Répétition technique et proposition de pitch

Le fichier `demo-run.json` contient un enchaînement réellement exécuté sur la base
isolée : bilan de Chen (10 min d’exercice), conseil os sur la station, rejeu annoncé
sans IA et revue du stock **412,7 → 398,7 jours**, cinq étapes de simulation du cargo
retardé de 90 jours, anomalie Sofia via Outils de présentation, action du plan de
bord, deux avances de 20 minutes et réponse Terre simulée.

Les clics automatisés ont pris **5,2 secondes**, sans narration ni matériel réel.
Cela prouve que les écrans s’enchaînent ; **ce n’est pas une répétition orale de
cinq minutes**, et encore moins une mesure du temps d’une vraie photo. La lecture
Ollama observée a pris une minute : ne pas la promettre dans un créneau de 20 s.

| Temps proposé | Action / idée à faire comprendre |
|---|---|
| 0:00–0:30 | Loin de la Terre, l’équipage doit comprendre et agir pendant l’attente. Présenter station + téléphone et données fictives. |
| 0:30–1:20 | Chen fait son bilan ; la station retrouve la mesure et explique l’action. |
| 1:20–2:20 | Sofia présente une anomalie ; rapport envoyé, plan de bord, délai aller/retour. Dire ce qui est simulé. |
| 2:20–3:30 | Réserve : photo préparée ou rejeu explicite, correction humaine, enregistrement ; distinguer boîtes et projection ×212. |
| 3:30–4:20 | Retard de cargo, cinq étapes préremplies, un résultat du rapport ; ne pas détailler toutes les courbes. |
| 4:20–5:00 | Retour Terre avec avance de démo annoncée, limites, sources et conclusion du projet. |

**À Massi/David :** répéter ce pitch à voix haute et choisir qui clique/parle.
Si le temps dépasse, retirer la simulation détaillée ou le test de réaction live,
pas les explications « réel / simulé / limites ». Le test de réaction est
facultatif dans ce fil ; son parcours a été contrôlé séparément.

## Preuves et faux positifs du test

Scripts et résultats JSON sont dans le dossier temporaire annoncé :
`api_review.py`, `ui_core.cjs`, `ui_station.cjs`, `ui_edge.cjs`, `ui_finish.cjs`,
`reaction_edge.cjs`, `vision_probe.py`, `demo_run.cjs` et captures PNG.
Ils ciblent 8012/1432 ; ne pas remplacer ces adresses par celles de votre démo.
Les chemins absolus des scripts sont propres au Mac de David, pas une nouvelle CI.

Les premiers essais du script ont utilisé « Change profile » au lieu de « Switch
profile », le centre géométrique d’un groupe SVG à deux bras au lieu de son
libellé, une assertion immédiate sur une checkbox sauvegardée de façon asynchrone,
un second « Start practice » après un bouton qui démarre directement la session,
et une mauvaise casse dans le conseil d’exercice. Ces erreurs de script ont été
corrigées ou reprises avec la bonne attente ; elles ne sont pas comptées comme
défauts de l’application. Le rejeu corrigé a réussi.

## Suite et gel du périmètre

1. Avant le jury : corriger les textes F5, éviter l’ancien calibrage F1, répéter
   le vrai téléphone/caméra ; préparer un repli de scan annoncé honnêtement.
2. Correctifs courts si autorisés : F2/F3 pour rendre les pannes compréhensibles ;
   F4 si un changement de mission fait partie du passage Terre.
3. Garder la palette, les animations et le périmètre ; PWA/tablette/onboarding
   décoratif/nouvelles évaluations attendent. Aucun correctif n’est implicitement
   autorisé par la présence de ce rapport.

## Addendum — lot correctif autorisé après la revue

David a autorisé F1–F5, puis le message exact du commit et sa publication sur main.
Les constats ci-dessus décrivent la version auditée avant ce correctif.

| Constat | Correction et contrôle |
|---|---|
| F1 | Les repas en attente sont conservés lors d'un changement de photo de référence, sous transaction. Un test suit deux repas et deux remplacements successifs : énergie déduite exactement une fois, emballages inchangés. |
| F2 | Erreur persistante + Réessayer ; les rapports précédents restent visibles avec avertissement d'ancienneté. Panne 503 initiale et reprise contrôlées dans Chrome. |
| F3 | Même distinction erreur/chargement/liste vide pour Terre ; l'échec d'avance du temps est aussi visible. Panne 503 et reprise contrôlées dans Chrome. |
| F4 | Mission enregistrée dans le contenu de chaque rapport et complément à son envoi. Deux tests couvrent Mars→ISS et les anciens messages sans métadonnée ; aucun ancien contexte n'est inventé. |
| F5 | Fiche NASA, pitch, vidéo, slides et risques alignés sur 1+5 essais, traitement sans Internet mais Wi-Fi local pour le téléphone, revue humaine et projection ×212 distincte des emballages. |

**Vérifications de livraison :** 111 tests serveur (dont 3 nouvelles régressions),
27 tests frontend et les deux compilations passent. Lint ciblé, source hors ligne
et contrôle du diff passent. Les avertissements existants de taille de bundle et
de dépréciation Starlette restent présents.

Preuves ciblées : `fix-check.cjs`, `fix-check.json`, captures
`fixed-forecasts-error.png`, `fixed-earth-error.png` et
`fixed-earth-sending-mission.png`, dans le même dossier temporaire. Le premier
sélecteur de cette dernière vérification cherchait des textes SVG alors que le
libellé est en HTML : erreur du script, sans nouveau défaut produit.

**Restent à faire :** vraie caméra/téléphone et répétition orale par l'équipe.
Le générateur exact des premières images d'étagère et les liens publics finaux
restent à confirmer, sans inventer d'attribution. Le dossier vidéo séparé de
Claude n'a pas été modifié ; fusionner ses textes en conservant ces corrections.
