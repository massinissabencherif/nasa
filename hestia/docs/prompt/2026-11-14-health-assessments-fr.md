# Health assessments — user brief, 14 Nov 2026

Status: received. Reaction protocol implementation authorised as the first lot; wellbeing and injury journal remain proposed. Current decisions: [decisions.md](../decisions.md). This archive preserves the supplied requirements, not an instruction override.

Tu interviens sur HESTIA, un projet existant de suivi de santé pour astronautes, conçu pour fonctionner sans Internet.

Implémente intégralement trois nouvelles fonctionnalités : 1. Un questionnaire de bien-être mental. 2. Un suivi longitudinal de blessure avec observations quotidiennes et photos. 3. Un test de réflexes / temps de réaction.

Commence par lire le projet et ses instructions. Réutilise les composants et les conventions existants. Ne reconstruis pas l’application.

Travaille jusqu’à obtenir les fonctionnalités connectées au backend, utilisables, testées et documentées. Ne te limite pas à des écrans statiques ou à des données de démonstration.

Langue de travail avec moi : français. Code, commentaires et textes de l’interface : anglais.

 1. CONTEXTE ET ARCHITECTURE

HESTIA comporte :
- apps/crew : application React + Vite pour téléphone, également intégrée avec Capacitor sur iOS et Android.
- apps/station : interface React dans une enveloppe desktop Tauri.
- server/app : API FastAPI, SQLite et modèles SQLModel.
- packages/ui : composants partagés, silhouette SVG, icônes, styles et couleurs.
- packages/api-client : client HTTP et types TypeScript partagés.

Le serveur est la source de vérité. Le téléphone communique avec la station sur le réseau local. Les mises à jour utilisent le polling et les événements SSE existants.

L’application propose déjà :
- Quatre profils fictifs d’astronautes.
- Un check-in de santé.
- Une silhouette interactive.
- Un historique de mesures.
- Des alertes.
- Une liaison Terre simulée.
- Un système de démonstration.

Les nouvelles fonctions doivent s’intégrer à ces parcours.

Contraintes :
- Aucun service cloud, CDN, analytics ou API externe à l’exécution.
- Aucun nouveau modèle IA nécessaire.
- Photos et observations restent sur la station locale.
- Pas de diagnostic, de prescription ou de prétention à une validation clinique.
- Ne pas déduire automatiquement l’état psychologique d’un texte ou l’état d’une blessure d’une image.
- Respecter le style visuel existant.
- Garder une interface lisible à partir de 390 px de large.
- Préserver les fonctionnalités actuelles.

 2. NAVIGATION ET POINTS D’ENTRÉE

Créer dans l’application Crew un espace « Health assessments » regroupant :
- Mental wellbeing.
- Injury journal.
- Reaction test.

Intégration souhaitée :
- Un accès visible depuis Home.
- Un accès contextuel depuis la zone Brain / morale de la silhouette vers le questionnaire et le test de réaction.
- Un accès au journal de blessure depuis Home et, lorsque pertinent, depuis une zone corporelle associée.
- Éviter d’ajouter trois nouveaux onglets à la barre mobile existante.

Sur la station :
- Ajouter un accès aux évaluations depuis la fiche de chaque astronaute.
- Afficher les blessures actives et les derniers résultats de réaction.
- Appliquer les règles de visibilité particulières du questionnaire mental décrites plus bas.

Prévoir les états :
- Chargement.
- Aucune donnée.
- Erreur.
- Station déconnectée.
- Résultat incomplet ou session interrompue.

Une absence de résultat ne doit jamais être présentée comme un état de santé vert.

 3. QUESTIONNAIRE DE BIEN-ÊTRE MENTAL

Objectif : Permettre à l’astronaute de décrire son ressenti et de suivre son évolution pendant la mission.

Il s’agit d’un questionnaire personnalisé de suivi du bien-être. Ne pas le présenter comme un questionnaire clinique validé. Ne pas employer de score ou de seuil de dépression/anxiété inventé.

3.1 Questions

Titre : « Mental wellbeing check-in ».

Période de référence : « Thinking about the past 24 hours… ».

Prévoir six dimensions :
- Mood : Very low → Very good.
- Stress : Very low → Very high.
- Energy : Very low → Very high.
- Sleep quality : Very poor → Very good.
- Connection with the crew : Very disconnected → Very connected.
- Ability to focus : Very difficult → Very easy.

Chaque réponse utilise une échelle de 1 à 5. Afficher le libellé associé à chaque valeur. Aucune réponse présélectionnée.

Champs facultatifs :
- « What affected your wellbeing today? »

 Choix multiples : workload, isolation, sleep, conflict, mission uncertainty, physical discomfort, other.
- « Anything you want to note? »

 Texte libre, limité à une longueur raisonnable.
- « Would you like support from a crewmate? »

 Yes / No, sans réponse présélectionnée.

Permettre :
- D’ignorer une question.
- De quitter le formulaire.
- D’enregistrer une réponse partielle explicitement identifiée comme telle.

Ne pas interpréter automatiquement le texte libre avec un LLM.

3.2 Résultats et tendances

Après enregistrement :
- Confirmer que les réponses sont sauvegardées.
- Afficher les six dimensions avec leur libellé.
- Montrer l’évolution par dimension sur 7 et 30 jours.
- Afficher la couverture : nombre de jours renseignés sur la période.
- Signaler si une comparaison repose sur peu de réponses.
- Ne pas remplacer les réponses manquantes par une valeur moyenne.

Ne pas créer de note globale de « santé mentale sur 100 ».

Pour les tendances :
- Comparer uniquement des réponses de même dimension.
- Distinguer correctement le sens des échelles : stress élevé et énergie élevée n’ont pas la même signification.
- Présenter des descriptions factuelles, par exemple :

 « Stress was rated higher than in your previous entries. »
- Ne pas déduire une maladie, une aptitude opérationnelle ou une urgence à partir de ce questionnaire.

3.3 Actions proposées

Proposer des actions générales, courtes et non médicales :
- Take a short break.
- Protect your next sleep period.
- Talk with a trusted crewmate.
- Review today’s workload with the crew lead.

Si la personne demande du soutien :
- Lui proposer explicitement d’envoyer une demande à l’équipage.
- Montrer le message exact avant confirmation.
- Envoyer uniquement le contenu qu’elle a accepté de partager.
- Permettre de suivre la demande comme ouverte / prise en compte.
- Ne pas envoyer automatiquement les réponses ou le texte libre vers la Terre.

Ne pas ajouter de question sur le risque suicidaire dans cette version : cela nécessiterait un parcours de prise en charge spécifiquement conçu et validé.

3.4 Confidentialité

Avant l’enregistrement, expliquer clairement :
- Ce qui est enregistré.
- Où cela est conservé.
- Ce qui apparaît sur la station.

Par défaut :
- Les réponses détaillées et notes libres n’apparaissent pas dans la vue collective de la station.
- Aucun événement SSE ne transporte les réponses ou notes.
- La station reçoit uniquement une demande de soutien explicitement partagée, si elle existe.
- Les réponses détaillées ne figurent pas dans les alertes génériques ou les rapports Terre.

Attention : HESTIA utilise actuellement un sélecteur de profils et non une authentification forte. Ne pas afficher « only you can access this » ou prétendre fournir une confidentialité garantie. Décrire honnêtement la visibilité dans l’interface et documenter la limite d’accès du prototype.

Ne pas exposer les données détaillées dans une réponse API collective puis simplement les cacher en CSS.

 4. JOURNAL DE BLESSURE AVEC PHOTOS

Objectif : Documenter une blessure au fil des jours pour pouvoir comparer les observations, suivre les actions et préparer une transmission.

Ce module est un journal. Il ne détecte ni infection ni guérison automatiquement.

4.1 Création d’une blessure

Champs :
- Short title, obligatoire.
- Body location, obligatoire.
- Side : left / right / central / not applicable.
- Date first noticed, obligatoire.
- Context / how it happened, facultatif.
- Initial description, facultative.

Localisation :
- Réutiliser la silhouette ou proposer une liste simple cohérente avec elle.
- La localisation doit être assez précise : bras, main, jambe, pied, tronc, tête, autre.
- Ne pas forcer une correspondance artificielle avec les huit zones fonctionnelles de la silhouette.

État :
- Active.
- Monitoring.
- Closed.

Le passage à Closed est une décision de l’utilisateur. Libellé : « Close this injury journal ». Ne pas afficher « Healed » comme conclusion automatique.

4.2 Observation quotidienne

Pour chaque observation :
- Date et heure.
- Description libre.
- Pain / discomfort, de 0 à 10, avec libellés clairs.
- Évolution ressentie : better / unchanged / worse / unsure.
- Présence observée de redness, swelling, discharge, bleeding.

 Pour chaque élément : yes / no / unsure.
- Functional impact : none / mild / moderate / severe / unsure.
- Actions taken : texte libre.
- Jusqu’à trois photos.

Aucune valeur ne doit être présélectionnée en « normal ».

Permettre plusieurs observations dans une même journée. L’interface les regroupe par jour sans écraser les entrées précédentes.

La douleur seule ne doit pas déclencher un diagnostic ou une couleur clinique.

4.3 Capture et stockage des photos

Sur téléphone :
- Bouton « Take a photo ».
- Bouton « Choose a photo ».
- Utiliser la capture système et les capacités déjà disponibles dans HESTIA.
- La fonction doit rester utilisable sur le LAN en HTTP via le sélecteur de fichiers, même sans caméra intégrée à la page.

Avant upload :
- Aperçu.
- Possibilité de retirer une image.
- Légende facultative.
- Conseils simples : même angle, même lumière, même distance.
- Suggérer une règle visible si l’utilisateur souhaite documenter une taille.

Ne pas calculer une taille réelle sans référence d’échelle. Ne pas analyser la couleur pour produire un score de guérison.

Côté serveur :
- Limite explicite de taille.
- Validation du contenu réel de l’image.
- Prendre en charge JPEG et PNG au minimum.
- Message clair pour les formats non pris en charge, notamment si un iPhone fournit un format incompatible.
- Redimensionnement raisonnable et réencodage pour limiter le stockage et supprimer les métadonnées EXIF.
- Noms générés côté serveur.
- Stockage hors Git.
- Aucun chemin arbitraire fourni par le client.
- Vérifier l’appartenance des photos à la bonne observation et à la bonne blessure.

En cas d’échec partiel :
- Conserver le formulaire et les images encore non envoyées.
- Ne pas afficher « saved » si la sauvegarde a échoué.
- Permettre de réessayer sans créer de doublons.

4.4 Consultation

Liste des blessures :
- Titre.
- Localisation.
- État.
- Date de dernière observation.
- Dernière évolution déclarée.
- Miniature si disponible.

Fiche d’une blessure :
- Informations initiales.
- Frise chronologique des observations.
- Courbe de douleur déclarée.
- Galerie datée.
- Comparaison côte à côte de deux photos sélectionnées.
- Date et légende clairement affichées sur chaque image.
- Action « Add today’s observation ».

Ne pas afficher de pourcentage de guérison.

Une observation « worse » peut proposer : « Share an update with the crew ». Cette action doit être explicite, avec aperçu du contenu partagé.

4.5 Correction et suppression

Permettre :
- De corriger une observation.
- De supprimer une photo.
- De supprimer une observation.
- De clôturer puis rouvrir un journal.

Confirmer les suppressions. Supprimer les fichiers associés lorsqu’ils ne sont plus utilisés. Documenter la gestion des fichiers orphelins et du reset de démonstration.

 5. TEST DE RÉFLEXES / TEMPS DE RÉACTION

Objectif : Mesurer une performance simple, reproductible sur le même appareil, et suivre son évolution personnelle.

Nom dans l’interface : « Reaction time test ».

Ne pas le présenter comme :
- Une mesure directe du manque de sommeil.
- Un diagnostic de fatigue.
- Un test d’aptitude à une sortie extravéhiculaire.
- Un PVT cliniquement validé.

5.1 Introduction

Expliquer :
- Le signal à attendre.
- Le geste à effectuer.
- La durée approximative.
- L’intérêt d’utiliser le même appareil et des conditions semblables.
- Le fait que distraction et latence de l’appareil peuvent modifier le résultat.

Parcours : 1. Instructions. 2. Trois essais d’entraînement non enregistrés. 3. Quinze essais mesurés. 4. Résultat. 5. Historique.

Durée attendue : environ une à deux minutes. Afficher clairement le nombre d’essais.

5.2 Interaction

Chaque essai :
- État d’attente identifiable par du texte, pas uniquement une couleur.
- Délai aléatoire entre 2 et 5 secondes.
- Apparition d’un signal visuel très clair.
- Grande zone tactile pour répondre.
- Prise en charge du tactile, de la souris et du clavier.

Si l’utilisateur répond avant le signal :
- Afficher « Too early ».
- Enregistrer un faux départ.
- Rejouer l’essai après un nouveau délai.
- Ne pas compter cet événement comme un temps de réaction valide.

Si aucune réponse n’arrive après 3 secondes :
- Marquer l’essai comme « no response ».
- Ne pas inventer un temps de réaction.
- Passer à la suite avec un message clair.

Empêcher les doubles réponses sur le même essai.

5.3 Mesure technique

La mesure doit se faire dans le navigateur :
- Utiliser performance.now().
- Déclencher le signal en coordination avec requestAnimationFrame.
- Utiliser une gestion cohérente des événements pointer / clavier.
- Ne pas inclure de requête réseau dans le chronométrage.
- Ne pas produire deux mesures via pointerdown puis click.
- Ignorer les répétitions automatiques du clavier.

Si l’application passe en arrière-plan, perd la visibilité ou est interrompue :
- Invalider l’essai en cours.
- Suspendre la session.
- Expliquer ce qui s’est passé.
- Permettre de recommencer ou d’abandonner.
- Ne pas enregistrer la session comme complète.

Versionner le protocole pour éviter de comparer ultérieurement des tests différents.

5.4 Résultats

Afficher :
- Temps médian en millisecondes, indicateur principal.
- Nombre de réponses valides.
- Faux départs.
- Absences de réponse.
- Dispersion des résultats, si présentée avec une explication simple.
- Graphique des essais.

Ne pas afficher de seuil universel « bon / mauvais réflexe » inventé.

Historique :
- Dernières sessions.
- Évolution de la médiane.
- Sessions complètes uniquement pour la référence personnelle.
- Comparaison avec les cinq sessions complètes précédentes utilisant le même protocole sur le même appareil lorsque cette information est disponible.

Avant cinq sessions comparables : « Building your personal reference ».

Après : Présenter la différence absolue et relative avec cette référence, avec des termes factuels : « Median response time was 35 ms slower than your recent reference ».

Ne pas transformer automatiquement cette différence en alerte rouge.

Associer un identifiant local aléatoire de l’installation pour distinguer les appareils. Ne pas utiliser de fingerprinting. Documenter que cet identifiant ne garantit pas des conditions de mesure identiques.

5.5 Abandon et sauvegarde

Permettre d’abandonner à tout moment. Une session abandonnée ne doit pas alimenter la référence personnelle.

À la fin :
- Sauvegarder les résultats via l’API.
- Si la station est indisponible, conserver temporairement le résultat non sensible sur le téléphone avec l’état « pending sync ».
- Réessayer ensuite.
- Utiliser un identifiant de session unique pour empêcher les doublons.
- Afficher un état d’enregistrement explicite.

 6. INTÉGRATION AUX ÉCRANS EXISTANTS

Home Crew :
- Carte « Health assessments ».
- Dernier test de réaction et sa date.
- Blessures actives et dernière observation.
- Accès au questionnaire.
- Aucun résultat manquant affiché comme normal.

Silhouette :
- Brain / morale : accès aux évaluations de bien-être et de réaction.
- Blessures : afficher un lien contextuel si leur localisation est associable.
- Conserver une distinction visuelle entre une blessure déclarée et le statut calculé actuel d’une zone.

Ne pas modifier silencieusement les règles existantes de couleur de la silhouette. Si une nouvelle information n’a pas de règle documentée, l’afficher comme information complémentaire.

Station :
- Fiche astronaute enrichie.
- Historique des tests de réaction.
- Journaux de blessures et comparaisons photo.
- Demandes de soutien volontairement partagées.
- Aucune réponse mentale détaillée dans la vue collective.

Liaison Terre :
- Permettre de préparer un brouillon de rapport à partir d’une blessure ou d’un résultat.
- Montrer les informations incluses avant validation.
- Ne pas envoyer automatiquement le questionnaire mental ni les photos.
- Distinguer le texte compact des éventuelles pièces jointes.
- Ne pas prétendre qu’une photo est comprise dans un rapport de 600 caractères.
- Si les pièces jointes ne sont pas implémentées dans le simulateur de liaison, le dire clairement et permettre seulement la sélection de texte.

 7. MODÈLES DE DONNÉES ET API

Réutiliser SQLModel et les conventions actuelles.

Entités suggérées, à adapter proprement :
- WellbeingEntry.
- SupportRequest.
- Injury.
- InjuryObservation.
- InjuryPhoto.
- ReactionSession.
- ReactionTrial.

Prévoir :
- Identifiant de l’astronaute.
- Dates de création et de modification.
- Source manual / simulated.
- Statut partial / complete lorsque nécessaire.
- Version du questionnaire ou du protocole.
- Identifiant client unique pour les opérations pouvant être réessayées.

Pour le test de réaction :
- Conserver les essais bruts.
- Recalculer les statistiques côté serveur à partir des essais.
- Valider les valeurs et les limites de taille.
- Ne pas faire confiance aux agrégats envoyés par le téléphone.

Pour les questionnaires :
- Vérifier les bornes 1 à 5.
- Conserver null pour une réponse absente.
- Limiter les textes libres.

Pour les blessures :
- Valider douleur, dates, états et appartenance des ressources.
- Prévoir les relations et la suppression des photos.

Ajouter les endpoints nécessaires et les types du client partagé. Séparer les endpoints détaillés individuels des résumés destinés à la station.

Les événements SSE servent à signaler qu’une donnée a changé. Ils ne doivent contenir ni note sensible, ni photo, ni réponse mentale détaillée.

Ne pas supprimer la base existante à l’installation de ces fonctions. Prévoir une évolution additive compatible avec les données présentes. Le reset reste une action de démonstration explicitement déclenchée.

 8. DESIGN ET ACCESSIBILITÉ

Réutiliser :
- Panel.
- Button.
- StatusBadge lorsque pertinent.
- Les polices locales.
- Les couleurs et espacements de packages/ui.

Éviter :
- Une couleur rouge pour une simple baisse de performance.
- Les scores médicaux non fondés.
- Les formulaires excessivement longs sur un écran.
- Les textes techniques dans le parcours utilisateur.

Prévoir :
- Grandes cibles tactiles.
- Labels explicites.
- Navigation clavier.
- Contraste suffisant.
- Respect de prefers-reduced-motion.
- Dates lisibles.
- Confirmation visuelle de chaque sauvegarde.
- Préservation du brouillon en cas d’erreur réseau.

Ne pas utiliser le questionnaire mental pour un classement ou des badges compétitifs. Ne pas récompenser un « bon état psychologique ».

 9. DONNÉES DE DÉMONSTRATION

Ajouter des données fictives reproductibles :
- Plusieurs entrées de bien-être montrant une évolution sans diagnostic.
- Une blessure active avec plusieurs observations datées.
- Plusieurs sessions de réaction, dont une interrompue.
- Une demande de soutien explicitement partagée.

Photos :
- Ne pas télécharger de photos médicales non licenciées.
- Ne pas réutiliser les images du garde-manger.
- Si aucune image appropriée n’est disponible, fournir un état vide correct.
- Les images illustratives éventuelles doivent être clairement identifiées.

Les fonctions doivent fonctionner avec de vraies saisies, même sans données de démo.

Conserver les scénarios existants et leur comportement.

 10. TESTS ET CRITÈRES DE VALIDATION

Backend :
- Validation des questionnaires complets et partiels.
- Aucune réponse absente remplacée par une valeur.
- Pas de fuite des réponses mentales dans les résumés collectifs ou SSE.
- Demande de soutien créée uniquement après confirmation explicite.
- Création et suivi d’une blessure.
- Plusieurs observations le même jour.
- Upload invalide ou trop lourd refusé proprement.
- Isolation des photos par blessure / observation.
- Suppression cohérente des fichiers.
- Statistiques du test de réaction recalculées correctement.
- Faux départs et non-réponses exclus des temps valides.
- Session interrompue exclue de la référence.
- Comparaisons séparées par version du protocole et appareil.
- Réessai de sauvegarde sans doublon.
- Compatibilité avec les données et tests existants.

Frontend :
- Vérifier les parcours sur écran mobile et desktop.
- Vérifier les formulaires incomplets.
- Vérifier les erreurs réseau sans perte du formulaire.
- Vérifier le test interrompu par changement d’onglet.
- Vérifier les doubles événements tactiles.
- Vérifier la comparaison photo et les états sans image.
- Vérifier que les résultats inconnus ne sont pas verts.

Ne pas prétendre avoir testé un appareil physique si les vérifications ont seulement été faites dans un navigateur.

À la fin, fournir :
- Le résumé des fonctions implémentées.
- Les écrans et routes ajoutés.
- La procédure de lancement.
- Les tests réellement exécutés et leurs résultats.
- Les limites restantes.
- Un petit scénario de démonstration des trois fonctions.

Mettre à jour la documentation et docs/STATUS.md pour refléter exactement l’état final.
