# Script de démo — 5 minutes, puis 4 minutes de questions

Fil conducteur : **un astronaute se surveille lui-même, l'équipage agit
d'abord, la Terre confirme plus tard.**

Deux écrans : la **station** (portable, projeté) et un **téléphone** (appli
équipage). Ce script remplace celui de 3 minutes du 11 nov.

## Avant de monter sur scène

1. `make reset`, puis `make demo`.
2. Station → **Mission settings → Reset**.
3. Régler le facteur d'accélération du temps sur ×30 pour la liaison Terre.
4. Faire un scan caméra à blanc, pour que macOS ait déjà demandé l'accès à
   la caméra.
5. Remettre les 3 conserves dans le casier A1.
6. Téléphone : ouvrir l'appli, profil **Chen Wei**.

Chaque étape a un bouton de secours dans **Mission settings → Demo
controls**. Il passe par le même code que l'action réelle.

## Déroulé

| Temps | Ce que je fais | Ce que je dis |
|---|---|---|
| 0:00 – 0:30 | Station, écran **Crew** : quatre silhouettes vertes. Je montre la barre du haut : « Mars base · Earth reply in 40 min ». | « Base martienne. Quatre astronautes, pas de médecin, pas d'internet. Une réponse de la Terre met quarante minutes. L'énoncé le dit : les astronautes doivent pouvoir évaluer leur santé eux-mêmes. HESTIA tourne entièrement sur cet ordinateur. L'équipage est simulé, et ce n'est pas un dispositif médical. » |
| 0:30 – 1:20 | Téléphone, **Check-in**. Je tends le téléphone à un juré : **Reaction test → Start**, cinq signaux, vingt secondes. Résultat en millisecondes → **Add to my check-in**. | « Premier examen : rien à taper, le téléphone mesure. C'est une version courte du test de réaction que les équipages passent sur l'ISS pour repérer la fatigue. Le résultat est comparé à la référence personnelle de l'astronaute, pas à une moyenne. C'est un dépistage, pas un test validé, et l'appli le dit. » |
| 1:20 – 2:10 | Je touche le (i) de **Exercise** : comment, pourquoi, quel risque. Je saisis **10** minutes → **Save check-in**. Le conseil orange s'affiche. **See my body status** : la zone **Bones** est orange. Je touche la zone. Sur la station, la silhouette de Chen change en direct. | « Chaque mesure explique comment la prendre, pourquoi, et quel risque elle surveille. Troisième jour sous trente minutes d'exercice : la zone passe à l'orange. L'appli ne mesure pas l'os : elle suit la régularité de l'exercice, qui est la parade principale. Le conseil donne la valeur, les étapes et la procédure de bord. Orange : cela reste entre l'astronaute et l'appli. » |
| 2:10 – 3:10 | Station, **Mission settings → Run** « Sofia Lindqvist: fever + high heart rate » (ou bilan de Sofia sur le téléphone : 38,6 °C et pouls 124). **Alerts** : deux alertes rouges, première étape « Tell the crew medical officer now ». **Earth link** : rapport compact, compte à rebours. J'avance le temps : la réponse simulée arrive. | « Fièvre et pouls élevé ensemble : rouge. L'équipage est alerté tout de suite. Un rapport de moins de 600 caractères part vers la Terre, parce que deux indicateurs sont rouges en même temps. Une seule valeur un peu haute ne dérange pas la Terre : la règle est écrite, pas cachée. En attendant la réponse, l'équipage applique la procédure. » |
| 3:10 – 4:10 | Station, **Pantry** : 412 jours. Je retire les **3 conserves du casier A1**. **Scan now**. Pendant les vingt secondes du scan, je parle. Le compteur descend à **398**. | « La nutrition insuffisante fait partie des risques cités par l'énoncé. L'étagère est lue par une caméra et un modèle qui tourne sur ce portable. Les casiers sont fixes : le modèle ne fait que compter, et une lecture douteuse demande une confirmation humaine. Je retire trois lots… 412 jours d'autonomie deviennent 398. Échelle de démo : une boîte représente un lot de rations. » |
| 4:10 – 4:40 | Diapositive « vrai / simulé / sources ». | « Ce qui est réel : le logiciel, les règles, soixante tests automatiques, l'IA locale. Ce qui est simulé : l'équipage et les réponses de la Terre. Nos sources : le programme de recherche humaine de la NASA, la norme NASA-STD-3001, l'Agence spatiale canadienne. Une première version a été écrite avant l'événement, avec l'accord des organisateurs ; ce week-end, nous avons corrigé les règles, vérifié les sources et ajouté le test de réaction. » |
| 4:40 – 5:00 | Station : je bascule le contexte sur **Moon base**, puis j'ouvre **What-if simulator** deux secondes. | « Le même outil s'adapte à la Lune, à l'ISS, au transit. Et la suite du projet est là : simuler l'effet d'une décision avant de la prendre. Aujourd'hui ce simulateur repose sur des hypothèses affichées ; c'est notre prochaine étape. » |

Une phrase à glisser pendant le scan : « La grille des casiers se calibre une
fois, à l'installation de la caméra. »

## Si quelque chose casse

- **Le téléphone n'atteint pas la station** : ouvrir
  `http://localhost:8000/crew/` dans une fenêtre étroite du navigateur, ou
  utiliser le bouton « Chen Wei: low-exercise check-in ».
- **Le test de réaction se passe mal** (taps avant le signal) : ils ne sont
  pas comptés ; « Do it again » relance le test.
- **Le scan caméra échoue ou se trompe** : cocher « Accurate mode » si on a
  50 s, corriger le casier avec « Check count », ou choisir la source
  « Replay: 3 boxes removed (no AI) » : instantané, 412 → 398. Dire au jury
  que c'est un scan rejoué.
- **Ollama est arrêté** : seuls les scans caméra et image sont touchés.
- **Tout est dans un état bizarre** : Mission settings → **Reset**.

## Questions probables

| Question | Réponse courte |
|---|---|
| Pourquoi ces seuils ? | Ce sont des plages cliniques courantes, affichées comme indicatives. Ce ne sont pas des règles de vol NASA. Les règles d'envoi vers la Terre sont des choix de démo, écrits dans un fichier à part. |
| Et si l'astronaute ne fait pas son bilan ? | La zone passe à « no data », puis « no recent data » après 72 h. Elle n'est jamais verte par défaut. |
| Et si l'IA se trompe ? | Elle ne fait que compter des boîtes. Une lecture douteuse demande une confirmation. Aucune alerte de santé ne dépend d'une IA. |
| Pourquoi la nourriture dans un outil de santé ? | L'énoncé cite la nutrition insuffisante parmi les problèmes de santé des longues missions. |
| Le test de réaction est-il validé ? | Non. Il s'inspire du Reaction Self-Test de l'ISS (3 minutes). Le nôtre dure 20 secondes : c'est un dépistage, plafonné à un conseil orange. |
| Vos chiffres de radiation ? | Mars : instrument RAD du rover Curiosity. Lune : atterrisseur Chang'e-4, une mesure chinoise. ISS : hypothèse, affichée comme telle. |
| Qu'avez-vous fait ce week-end ? | Voir la section « What was built before the event » de la page projet. |

## Chiffres à connaître

- 412 → 398 jours : les 3 conserves A1 valent 14 jours pour 4 personnes à
  l'échelle de démo (1 boîte = 1 lot de 212 portions).
- Rapport Terre : une valeur critique, ou deux indicateurs rouges ensemble.
- Vision : 11 casiers exacts sur 12 sur une photo de test générée par IA,
  environ 19 s. Rien n'est encore mesuré sur une vraie étagère.
- Rayonnement Mars : 0,67 mSv/jour en surface (Curiosity) ; limite de
  carrière NASA : 600 mSv.
- Délai Mars–Terre : environ 3 à 22 minutes aller ; 20 minutes dans la démo.

## Non vérifié à ce jour

Ce déroulé a été rejoué étape par étape dans un navigateur sans écran le
14 nov., sauf le scan caméra. Il n'a pas encore été répété à voix haute,
chronométré, ni joué avec un vrai téléphone sur le réseau de la base.
