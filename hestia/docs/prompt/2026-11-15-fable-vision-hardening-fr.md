# Fable — fiabiliser la lecture de l'étagère

**15 novembre 2026 · brief pour David, à transmettre à Fable · non exécuté.**
Branche de départ : `fix/vision-reliability` (dossier de travail séparé de Codex).
Ce document n'autorise aucun push, fusion, téléchargement de modèle ou envoi de
photo à un service externe. Appliquer `AGENTS.md`. Commit : une seule phrase.

## L'objectif, dit honnêtement

Rendre la lecture **fiable et mesurée sur notre étagère calibrée**, pas « parfaite
pour toutes les images ». Aucun modèle local de 7 milliards de paramètres ne
promet cela, et personne ne doit l'annoncer au jury. Ce qu'on vise :

1. **Zéro erreur silencieuse** : toute case fausse est signalée à une personne.
2. Le **moins possible** d'erreurs signalées inutilement (sinon la confirmation
   humaine devient un fardeau).
3. Un **verdict chiffré sur de vraies photos réservées** à l'évaluation.
4. Un **secours annoncé** quand ce n'est pas fiable (scan rejoué, saisie manuelle).

Les seuils de réussite se fixent **avec David avant de mesurer**, pas après.

## Contraintes dures

- Tout reste **local et hors ligne** à l'exécution : pas de Claude, pas d'API
  cloud dans l'application. Fable sert à **écrire et optimiser le code**, pas à
  lire les images à la place du modèle.
- Un seul modèle en mémoire (Mac 16 Go) : `qwen2.5vl:7b`. Un autre modèle n'est
  téléchargé qu'avec l'accord de David, après avoir mesuré la mémoire disponible.
- Ne jamais coder les comptes attendus des images de test dans le moteur.
- Un seul changement à la fois, mesuré sur les mêmes images avant/après.
- Ne pas modifier les écrans : c'est le travail de Codex sur `fix/mobile-interactions`.
  L'option de lecture se branche plus tard, avec lui.

## Ce qui est déjà prouvé (15 nov., Mac de David, 2 images générées par IA)

Détails, scripts et sorties brutes : `docs/sources/2026-11-15-vision-cross-check.md`
et `docs/sources/vision-2026-11-15/`.

- Lecture de l'image entière : 11/12 et 10/12. A1 vide lue 1, sans alerte.
- Sans nommer l'aliment attendu dans le prompt : l'erreur se déplace (A4 vide lue 1).
- Une question sur la découpe de A1 seule : juste.
- **Contrôle croisé** (image entière puis rangées, désaccord = case signalée) :
  plus aucune erreur silencieuse sur ces 2 images. La pile A3 (4 boîtes) reste
  lue 2 dans **tous** les réglages.

Limites : 2 images, 1 essai par réglage, aucune vraie photo.

## Travail demandé, dans cet ordre

1. **Banc d'évaluation** : un dossier de photos + un fichier de vérité terrain
   par photo (nombre exact par case), une séparation réglage / réservé, et un
   script qui sort par case et au total : justesse, **erreurs silencieuses**, faux
   objets dans une case vide, boîtes manquées, durée à froid / à chaud, variabilité
   sur répétitions. Sorties brutes conservées.
2. **La pile A3** : comprendre pourquoi 4 est lu 2 (découpe trop large, résolution,
   cadrage, formulation « 2 rangées de 2 », recadrage agrandi de la seule case).
   Tester une cause à la fois. Si ce n'est pas corrigeable, le dire et garder la
   règle « pile = toujours à confirmer ».
3. **Contrôle de qualité avant le modèle** (vision classique, quasi gratuit) :
   flou, sous/sur-exposition, cadre décalé par rapport à la grille. Message clair
   à l'utilisateur plutôt qu'une lecture douteuse. Vérifier aussi que la grille
   calibrée correspond bien à l'étagère (la photo « après retrait » avait une case
   A1 déformée).
4. **Vitesse** : mesurer où passent les 20 à 60 secondes d'un scan (encodage
   d'image, nombre d'appels) et supprimer les appels inutiles. Aucune amélioration
   annoncée sans mesure.
5. **Caméra / vidéo** : choisir la **meilleure image** parmi quelques-unes
   (netteté), lancer un scan à la demande ou toutes les quelques dizaines de
   secondes, jamais un appel au modèle par image. Un seul scan à la fois,
   correction manuelle conservée.
6. **Verdict** : rapport court avec avant/après sur les mêmes images et sur les
   photos réservées, limites, recommandation pour la démo.

## Pistes hors démo : à mesurer avant de les promettre

Rien ci-dessous n'est mesuré ni installé. Ce sont des hypothèses pour un « vrai »
projet, à présenter comme une feuille de route, jamais comme un résultat.

- **Un modèle de vision local plus gros** de la même famille (ordre de grandeur :
  plusieurs dizaines de Go de mémoire, donc une station avec GPU, pas ce Mac de
  16 Go). Probablement meilleur pour compter une pile, **non garanti** : seule une
  mesure sur nos photos le dira. Ne rien télécharger sans l'accord de David.
- **Un détecteur d'objets entraîné sur nos 12 produits** (petit modèle de détection,
  rapide, tourne sur du matériel modeste). Souvent plus fiable qu'un modèle généraliste
  pour compter des objets connus sur une étagère fixe, mais demande des photos
  annotées et ne résout pas à lui seul les piles et les objets cachés.
- **Des capteurs plutôt que la seule caméra** : code-barres ou étiquettes par
  produit, pesée par case. La caméra devient un contrôle croisé. À vérifier avant
  de citer ce que les stations spatiales font réellement.
- Aucune de ces pistes ne promet « 100 % ». Le message honnête au jury : mesuré
  aujourd'hui sur N photos avec confirmation humaine, feuille de route décrite,
  non mesurée.

## Ce dont Fable a besoin de David

Environ **10 vraies photos** d'une étagère (ou d'une grille de 12 cases) avec des
boîtes de la maison : vide, pleine, une boîte retirée, une pile, lumière du jour,
lampe, léger angle. Le nombre exact par case écrit à la main. En garder au moins
la moitié **de côté**, jamais utilisées pour régler quoi que ce soit.

## Temps

La soumission ferme dimanche 15 nov. à 23 h 59. Limiter ce chantier à une durée
fixe décidée avec David, pour garder le temps de la vidéo ou des diapositives, de la
page NASA et d'une répétition complète.
