# Claude — revue des parcours avant le jury

**Pour David et Massi. Prêt à transmettre, non envoyé.**
David confie maintenant la revue des parcours et le scénario de démo à Massi.
Ce brief lui sert de checklist, avec Claude ou un autre agent s’il le souhaite.
Objectif : trouver les incohérences qui peuvent faire perdre le fil de la démo
avant la présentation de 18 h 30. PWA et finition tablette sont hors priorité.

## Reprise

Lire AGENTS.md, docs/STATUS.md et les dernières décisions. Utiliser les skills
hestia-context, hestia-verification et hestia-ui-polish ; human-brain-ux et
anti-vibecode sont des méthodes de revue, pas une preuve de validation utilisateur.
Vérifier les branches et propriétaires avant toute édition. Massi travaille sur
le simulateur et la Liaison Terre : ne pas modifier ses fichiers simultanément.
La branche Codex `fix/meal-history-clarity` traite Historique/Repas et leurs aides.
Les versions publiées et locales peuvent différer : noter le commit audité.

**Mission initiale : audit en lecture seule.** Pour chaque défaut, donner le
chemin, les étapes, le résultat attendu/obtenu, la gravité et une capture utile.
Avant une correction, appliquer l'accord d'édition/commit d'AGENTS.md. Aucune
publication, aucun message externe, aucun reset déduit de ce brief.

## Comment travailler vite

Passer les parcours ci-dessous dans la vraie app. Un screenshot ou une compilation
seule ne valide pas un parcours. Tester une réussite et l'échec le plus plausible.
Mutations sur une base jetable distincte ; ne pas utiliser/reset la base de démo
préparée par David. Le modèle de vision peut ralentir le Mac : coordonner son
usage. Lire les preuves existantes plutôt que relancer toutes les suites sans
nouveau motif. Ne pas chercher à refaire la direction artistique avant le jury.

Pour chaque écran, une personne doit pouvoir répondre : où suis-je, quelle est
l'action principale, qu'est-ce que ce chiffre représente, d'où vient-il et que
s'est-il passé après mon action ? Vérifier les textes FR/EN, unités, valeurs
absentes/anciennes, retours arrière, fermeture des fiches et erreurs réseau.

## Parcours à contrôler

| Parcours | Succès attendu / pièges à chercher |
|---|---|
| QR → profil → accueil équipage | Le QR vise le Mac sur le réseau local ; un changement de profil change toutes les données affichées. Le retour accueil garde le bon profil. Internet et Wi-Fi local sont bien distingués. |
| Bilan → ressenti → mesures → vérification → enregistrer | Les réponses survivent à un retour et un échec. Le POST correspond aux valeurs saisies, les champs vides restent inconnus. Le succès apparaît après confirmation serveur, une seule fois. Vérifier la mise à jour sur station et les aides SYS/DIA/pouls. |
| Silhouette → zone → mesures → explication/action | La couleur correspond aux données et à leur fraîcheur ; absence de données différente de normal. L'organe sélectionné, les unités et la règle consultée correspondent. Une action et sa limite se lisent avant les détails. |
| Test de réaction → résultat → historique → reprise | 1 entraînement + 5 mesurés ; attente variable. Faux départ, absence de réponse, perte de focus, sauvegarde réseau différée, absence de doublon. Aucun mélange entre protocoles ou mesure historique et nouvelles sessions. Médiane/comparaison explicables, sans diagnostic. |
| Historique → changer de mesure rapidement → erreur/réessai | Ni valeur ni courbe de tension sous une unité de poids/glucose. Dernière valeur, date et origine correctes. Deux tensions clairement nommées. Une panne n'est pas un historique vide. |
| Repas → suggestion ou aliment → enregistrer → stock | Le nombre d'unités et les kcal sont les mêmes sur le repas et dans les calculs. Ne pas confondre emballages réels et échelle virtuelle ×N. Échec au milieu d'une suggestion : indiquer les seuls aliments enregistrés ; ne pas annoncer le repas entier réussi. Vérifier la déduction et l'absence de double comptage après scan. |
| Réserve → caméra/import → cadrer → attribuer → analyser → corriger → confirmer | Cases/dimensions locales et attributions concordent. Crop utilisé pour l'analyse et aperçu cohérents. Une image rejetée ne change rien. Quitter pendant l'analyse, refus caméra, comptage faux, cases vides et produits répétés restent compréhensibles. Enregistrement explicite après vérification humaine. |
| Réglages → produits/valeurs → multiplicateur → stock vide | Annuler n'efface rien ; conséquences des corrections annoncées. ×1 et ×N explicites ; unités par emballage cohérentes. Le stock vide conserve catalogue/attributions/santé. Reset complet protégé et réservé à la base jetable. |
| Mission → liaison/délais → réserve → simulateur | Le scénario actif concorde partout ; objectif et hypothèses clairs. Aucun clic sur une projection ne change silencieusement la mission. Une absence de ravitaillement ne devient pas zéro jour. |
| Bilan critique → alertes → rapport Terre → livraison → réponse | Déclenchement selon les règles réelles, pas toute valeur rouge. Délai aller distinct du retour, horloge accélérée expliquée. Réponse simulée identifiée. Actions/acquittements ne font pas disparaître un problème sans explication. À coordonner avec Massi. |
| Réserve → simulateur guidé → rapport → historique → modifier | Les cinq étapes utilisent les données confirmées ; le rapport sauvegardé reste figé quand le contexte change. Rapport modifié = nouveau rapport. Tous les résultats critiques sont trouvables et compréhensibles immédiatement. À coordonner avec Massi. |
| Guide/aides/crédits et sources | Réponses courtes et exactes, retour facile à la tâche. Pas d'affirmation « NASA valide nos seuils », « vraies données cliniques » ou « entièrement autonome sans réseau ». Sources et hypothèses accessibles. |

## Points déjà connus, à ne pas confondre avec une régression

- Le 15 novembre, l'historique a affiché une ancienne tension de 118 sous « Poids »
  et « kg » pendant une requête lente. Codex corrige cette association de données
  sur `fix/meal-history-clarity` ; vérifier la version réellement chargée.
- Les valeurs nutritionnelles sont par unité du catalogue ; le modèle ne mesure
  pas les nutriments sur la photo. Sans portion fractionnée, un emballage de riz
  peut représenter 1800 kcal. C'est une limite du prototype à expliquer, pas une
  portion personnalisée ni une recommandation de tout consommer.
- Un enregistrement multi-aliments n'est pas atomique : une partie peut réussir
  avant une panne. Le reçu doit rester fidèle. Un timeout après écriture serveur
  peut laisser un résultat incertain ; ne pas réessayer aveuglément.
- Le simulateur a des compteurs ouvrant des détails, y compris les résultats
  rouges. Désaccord explicite avec la règle de visibilité des avertissements dans
  STATUS ; à arbitrer avec Massi/David, pas à changer silencieusement.
- Les ajouts Terre et QR photo publiés par Massi jusqu’à `bf214a8` sont intégrés
  à la livraison de ce lot. Vérifier le commit chargé avant la revue. Certaines
  docs historiques mentionnent encore 15 essais : les décisions
  récentes et le protocole courant 1+5 prévalent ; réconcilier le pitch/la fiche.
- Le téléphone a ouvert l'app sur le réseau local. Le parcours complet matériel
  n'est pas validé pour autant ; caméra physique et nouveaux produits à répéter.

## Livrable court

Un seul rapport avec : **bloque la présentation / gêne la compréhension / peut
attendre**. Pour chaque ligne : preuve, effet pour le jury, correctif minimal,
propriétaire et état. Finir par un parcours de démo réellement répété en cinq
minutes, avec repli photo importée/rejeu explicite si la caméra ou le modèle
échoue. Aucun chiffre de fiabilité inventé et aucune certification médicale.

Écarter les nouveaux questionnaires, journal de blessures, capture vidéo continue,
entraînement de modèle et décoration sans usage. La fiche NASA, la déclaration IA,
le support et les liens publics doivent ensuite décrire la version réellement
présentée ; les brouillons anciens ne sont pas prêts à publier tels quels.
