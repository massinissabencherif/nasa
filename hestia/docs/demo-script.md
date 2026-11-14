# Script de démo — 3 minutes (français)

Deux écrans : la **station** (portable, projeté) et un **téléphone** (app
équipage). Avant de monter sur scène : `make demo`, puis Mission settings →
**Reset**, réseau de la base actif, un scan caméra déjà fait une fois (pour
que macOS ait demandé l'accès caméra), les 3 conserves A1 en place.

Chaque étape a un bouton de secours dans **Mission settings → Demo controls**
(même code que l'action réelle).

| Temps | Ce que je fais | Ce que je dis |
|---|---|---|
| 0:00 – 0:25 | Station, écran **Crew** : quatre silhouettes vertes. Je montre la barre du haut : « Mars base · Earth reply in 40 min ». | « Base martienne. Quatre astronautes, pas de médecin, pas d'internet. La Terre est à vingt minutes aller, quarante aller-retour. HESTIA tourne entièrement sur cet ordinateur, IA comprise. Toutes les données de l'équipage sont simulées, et ce n'est pas un dispositif médical. » |
| 0:25 – 1:00 | Téléphone : profil **Chen Wei** → **Check-in**. Je touche le (i) de « Exercise » pour montrer comment / pourquoi / risque. Je saisis **10** minutes d'exercice → **Save**. L'écran affiche le conseil orange. Retour Home : la zone **Bones** est orange. Sur la station, la silhouette de Chen change en direct. | « Chen fait son bilan du jour. Chaque mesure explique comment la prendre, pourquoi, et quel risque elle surveille. Troisième jour sous trente minutes d'exercice : la zone os passe à l'orange. En gravité réduite on perd 1 à 1,5 % de masse osseuse par mois. L'application propose une routine d'exercice et renvoie à une procédure de bord. Orange : ça reste entre l'astronaute et l'appli. » |
| 1:00 – 1:45 | Station, **Pantry** : 412 jours. Je retire physiquement les **3 conserves du casier A1**. Source « Live camera » → **Scan now**. Pendant le scan (≈ 20 s) je parle. Le compteur descend à **398**, « −14 d », la jauge passe à l'orange. | « L'étagère est lue par une caméra et un modèle de vision local. Douze casiers fixes : le modèle ne fait que compter. Je retire trois lots… scan… 412 jours d'autonomie deviennent 398. Échelle de démo : une boîte représente un lot de rations. Si une lecture est douteuse, l'écran demande une confirmation humaine. » |
| 1:45 – 2:25 | **Forecasts** : curseur **Resupply delay** à **60** jours. La courbe de stock tombe à zéro avant le cargo. Je clique **Ration to last**. La courbe de poids descend. J'ouvre **Assumptions & sources** une seconde. | « Le cargo a soixante jours de retard. À ration pleine, on tombe à sec avant son arrivée. Le simulateur calcule la ration qui tient jusqu'au bout, et ce qu'elle coûte : la courbe de poids de l'équipage. C'est un simulateur fondé sur des valeurs de référence NASA, pas un modèle entraîné, et chaque hypothèse est affichée. » |
| 2:25 – 3:00 | **Mission settings → Run** « Sofia Lindqvist: fever + high heart rate » (ou check-in de Sofia sur le téléphone : température 38,6, pouls 124). **Alerts** : alerte rouge. **Earth link** : rapport compact, compte à rebours 20:00. Je clique **+20 min** deux fois : réponse simulée. | « Fièvre et pouls élevé chez Sofia : rouge. L'équipage est alerté sur la station et sur le téléphone, et un rapport de moins de 600 caractères part vers la Terre. Il arrive dans vingt minutes ; la réponse dans quarante. En attendant, l'équipage applique la procédure. HESTIA : savoir quoi faire quand personne ne peut répondre tout de suite. » |

## Si quelque chose casse

- **Le téléphone n'atteint pas la station** : ouvrir
  `http://localhost:8000/crew/` dans une fenêtre étroite du navigateur, ou
  utiliser le bouton « Chen Wei: low-exercise check-in ».
- **Le scan caméra échoue ou se trompe** : cocher « Accurate mode » si on a
  50 s, corriger le casier avec « Check count », ou choisir la source
  « Replay: 3 boxes removed (no AI) » : instantané, 412 → 398.
- **Ollama est arrêté** : seuls les scans caméra / image sont touchés ; le
  reste fonctionne.
- **Tout est dans un état bizarre** : Mission settings → **Reset**.

## Chiffres à connaître

- 412 → 398 jours : les 3 conserves A1 valent 14 jours pour 4 personnes à
  l'échelle de démo (1 boîte = 1 lot de 212 rations).
- Besoin de l'équipage : environ 9 600 kcal/jour (Mifflin-St Jeor × facteur
  d'activité) ; référence NASA ≈ 2 870 kcal par personne.
- Cargo prévu dans 380 jours (hypothèse de démo) ; avec 60 jours de retard il
  faut tenir 440 jours, soit une ration d'environ 90 %.
- Vision : 11 casiers exacts sur 12 sur la photo de test, environ 19 s ; les
  conserves empilées (A3) sont toujours envoyées en confirmation.
- Rayonnement Mars : 0,67 mSv/jour ; limite de carrière 600 mSv.
