# HESTIA — contre-expertise de l'audit Codex

> **Provenance.** Review written by Claude (Opus 5.5) on 14 Nov 2026 for David
> and Massi, in French, in answer to an audit by Codex of the same version.
> Kept unchanged as a source. Its proposals are not decisions: see
> [decisions.md](../decisions.md).

**Claude · 14 nov. 2026 · version auditée `39ddd85` · aucun code modifié**

Comment lire ce document :
- **Reproduit** : j'ai exécuté le cas moi-même.
- **Documenté** : le dépôt ou une source l'affirme, sans que je l'aie rejoué.
- **Incertain** : non établi.

## 0. Ce que j'ai fait

- J'ai relancé les tests : **53 passent** (`server/.venv/bin/python -m pytest -q`).
- J'ai écrit un script de reproduction qui passe par l'API, sur une base SQLite jetable (`HESTIA_DB_PATH`). Le dépôt est resté propre (`git status` vide avant et après).
- J'ai lu la [page officielle du défi](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/), téléchargée le 14 nov., et sa liste de ressources :
  - côté NASA : *5 Hazards of Human Spaceflight*, *Risks of Human Spaceflight*, *Ongoing HRP Research* ;
  - côté Agence spatiale canadienne (ASC) : *Monitoring Radiation for Astronaut Health* et *Why Do We Conduct Science Experiments in Space?*
- J'ai vérifié les valeurs scientifiques (section 4).
- Non reproduit : la compilation des deux applications web, le contrôle dans le navigateur, la caméra, le modèle de vision et les applications natives.

## 1. Verdict : HESTIA

**Je confirme la conclusion de Codex : partir sur HESTIA.**

| Critère | HESTIA | Field Shift |
|---|---|---|
| Correspondance avec l'énoncé | Très forte. Les six indicateurs cités par l'énoncé (tension, pouls, glycémie, température, sommeil, humeur) sont saisis. La silhouette cliquable est l'exemple donné par l'énoncé lui-même. Les alertes vers les « flight surgeons on the ground » sont là. Les cinq pistes facultatives sont couvertes. | Bonne, mais il faut tout construire |
| Avancement | Application de bout en bout, 53 tests | Reconnaissance seulement, zéro code |
| Risque scientifique | Moyen et corrigeable : seuils, libellés, sources | Élevé : agronomie non validée |
| Usage des données NASA | Faible : valeurs de référence, pas de jeu de données | Fort : séries NASA POWER réelles |

Limites de la comparaison :
- On compare un prototype de deux jours à un dossier de recherche. L'écart d'avancement décide presque tout.
- HESTIA dépend d'un seul Mac, celui de Massi. Sur le Mac de David, `uv`, `ollama` et `cargo` sont absents.
- Le côté « données NASA » restera modeste. Il faut le compenser par la rigueur des sources, en reliant chaque zone à un risque officiel du programme de recherche humaine de la NASA (HRP).

## 2. Les trois comportements signalés par Codex, et deux de plus

| # | Comportement | Statut | Cause dans le code |
|---|---|---|---|
| 1 | 7 bilans le même jour comptent comme « 7 jours consécutifs ». La zone os passe au rouge **et un rapport part vers la Terre**. | **Reproduit** | `engines/status.py` : `_recent_values(..., "exercise_min", limit=14)` compte des **lignes**, pas des jours. `engines/thresholds.py::exercise_streak_level` |
| 2 | Un profil sans aucune mesure affiche ses 8 zones en vert | **Reproduit** | `engines/status.py::crew_status` : `worst_level(levels) if levels else "green"`. En plus, `indicator_level("symptom")` renvoie `green` même sans aucun bilan |
| 3 | Un repas d'une soupe (212 kcal) retire 44 944 kcal du stock : l'autonomie passe de 412,7 à **408,0 jours** | **Reproduit** | `engines/nutrition.py::current_stock` : `pending_delta` est multiplié par `units_per_lot` (212). Un repas retire donc un lot entier de démo |
| 4 | Une tension systolique de 140 seule, tout le reste normal, envoie un **rapport vers la Terre** | **Reproduit** | `thresholds.json` : `red ≥ 140`. `engines/alerts.py` : tout rouge déclenche un `EarthMessage` |
| 5 | Le conseil est identique à 37,5 °C (orange) et à 39,5 °C (rouge) | **Reproduit** | `engines/advice.py::generate_advice(indicator, use_llm)` ne reçoit ni la valeur ni le niveau |

Autres constats de Codex :
- **Documents incohérents : confirmé par lecture.**
  - `docs/STATUS.md` dit à la fois « pas de Xcode complet, aucune version native tentée » et « 14 nov. : Xcode 27.2, app lancée sur iPhone ».
  - `CLAUDE.md` dit « HTTP simple, pas de TLS », alors que `STATUS.md` décrit un accès HTTPS sur `:8443`.
- **Vision : confirmé par `docs/vision-benchmark.md`.**
  - Les deux images de test sont générées par IA.
  - Résultats : 11/12, puis 10/12 après retrait, en environ 19,4 s.
  - A3 (boîtes empilées) n'est jamais compté juste.
  - L'exactitude sur une vraie étagère est **inconnue**.

## 3. Les cinq corrections prioritaires

Dans l'ordre de leur impact sur la démo et sur les questions du jury.

**P1 — Distinguer « à surveiller » de « urgence », et adapter le conseil à la gravité.**
- Aujourd'hui, tout rouge part vers la Terre, et les conseils orange et rouge sont identiques.
- À faire :
  - Ajouter un drapeau « rapport Terre » par règle, réservé à une bande critique que l'équipe valide.
  - Faire recevoir au conseil le niveau et la valeur. En rouge, il ajoute « prévenir le responsable médical de l'équipage maintenant ».
  - Préciser « à jeun » pour la glycémie.
- Fichiers : `server/data/thresholds.json`, `server/app/engines/alerts.py`, `server/app/engines/advice.py`.

**P2 — Faire corriger la science par Fable : zone radiation, sources et lien vers les risques HRP.**
- Renommer la zone « Skin » en « Radiation exposure (whole body) ». Selon le HRP, le risque est le cancer et le système nerveux central.
- Relier chaque zone au risque officiel correspondant de *Risks of Human Spaceflight*, une ressource officielle du défi.
- Corriger les sources (section 4).
- Fichiers : `packages/ui/src/zones.ts`, `server/app/engines/status.py` (`HRP_HAZARD`), `server/data/nasa_reference.json`, `docs/nasa-project-page.md`.

**P3 — Afficher « pas de donnée » au lieu du vert.**
- Ajouter un état « unknown » (gris) quand aucune mesure n'existe ou qu'elle est trop ancienne. Les symptômes ne doivent plus être verts sans bilan.
- Fichiers : `server/app/engines/status.py`, la silhouette et le panneau de zone dans `packages/ui`.

**P4 — Compter l'exercice par jour civil.**
- Regrouper `exercise_min` par jour (somme ou maximum) avant de calculer la série.
- Vérifier que le scénario `low-exercise` et `test_demo_e2e.py` restent verts.
- Fichiers : `server/app/engines/status.py`, `server/app/engines/thresholds.py`.

**P5 — Faire retirer à un repas une ration réelle, pas un lot de démo.**
- L'événement repas doit compter en portions, et pas multiplié par `units_per_lot`. Les scans, eux, restent à l'échelle de démo.
- Fichiers : `server/app/engines/nutrition.py` (`current_stock`), `server/app/routes/crew.py` (`eat_meal`).

**Hors priorité :** remettre `docs/STATUS.md`, `CLAUDE.md` et `README.md` d'accord sur l'état réel du projet.

## 4. Science : ce qu'on peut affirmer, ce qu'on retire

### On peut affirmer, avec la source

| Affirmation | Source | Remarque |
|---|---|---|
| Les 5 dangers : radiations, isolement et confinement, distance de la Terre, gravité, environnements clos hostiles | [NASA HRP — hazards](https://www.nasa.gov/hrp/hazards) et l'énoncé du défi | L'énoncé dit « gravity fields » |
| Tension, pouls, glycémie, température, sommeil, humeur sont des indicateurs utiles | L'énoncé du défi lui-même | C'est la meilleure justification du choix des mesures |
| Limite de carrière : 600 mSv, calculée pour plafonner le risque de décès par cancer à 3 % | [NASA OCHMO, fiche technique « radiation protection »](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf) (NASA-STD-3001) | Il existe aussi une limite de 250 mSv par éruption solaire, utile pour la tempête du simulateur |
| Surface de Mars : environ 0,67 mSv/j ; trajet : environ 1,8 mSv/j | [SwRI, Curiosity RAD](https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars) ; [Scientific American](https://www.scientificamerican.com/article/radiation-on-mars-managea/) cite 0,64 et 1,84 | Mesures faites près du maximum solaire. À dire si on nous le demande |
| Surface de la Lune : 1,369 mSv/j | Chang'e-4, Zhang et al. 2020, *Science Advances* ([résumé](https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html)) | **Ce n'est pas une donnée NASA.** Il faut la citer comme une mesure chinoise |
| Perte osseuse d'environ 1 à 1,5 % par mois | [ASC — TBone](https://www.asc-csa.gc.ca/eng/sciences/tbone.asp), partenaire officiel du défi ; [revue PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7200725) | Moyenne qui varie selon l'os (la hanche perd plus) |
| Le SANS (atteinte de l'œil liée au vol spatial) se dépiste par OCT, un examen d'imagerie de l'œil, sur l'ISS depuis 2013 ; un œdème du disque optique chez environ 70 % des équipages | [Briefing NASA (NTRS)](https://ntrs.nasa.gov/api/citations/20230006218/downloads/Brunstetter%20-%20Crewmember%20SANS%20Overview%20-%20Export%20Control%20-FINAL%20-%2001May23.pdf) | Donc **on ne peut pas l'évaluer soi-même** à partir d'un symptôme. L'app peut seulement rappeler l'examen et noter les changements de vision |
| Délai Mars–Terre d'environ 3 à 22 min aller, jusqu'à 44 min aller-retour | [NASA ASCEND (NTRS)](https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf) | Remplacer « 4–24 min » |

### On retire ou on reformule

- **« Skin » pour les radiations** → « Radiation exposure (whole body) ».
- **« Bones » au vert ou au rouge selon l'exercice** → l'appeler « countermeasure adherence » (régularité de l'exercice). On ne mesure pas l'os.
- **« NASA reference ≈ 12 000 kJ/j (2 870 kcal) »** → source introuvable. À retirer, ou à sourcer avant la démo.
- **ISS 0,523 mSv/j** → source inconnue. À sourcer (piste : la ressource de l'ASC sur les radiations) ou à donner en fourchette.
- **O₂, CO₂ et 98 % de recyclage de l'eau** → stockés mais jamais utilisés. À retirer du tableau « NASA Data ».
- **Seuils médicaux** → ce sont des plages cliniques courantes, pas des règles de vol NASA. La page projet le dit déjà ; il faut aussi le dire à l'oral.
- **Les chiffres du simulateur** (−13 % de poids, courbe osseuse) → hors du pitch. Si on les montre : « direction seulement ».
- **« 11/12 en vision »** → toujours ajouter « sur une image de test générée par IA ».

**Statut de cette vérification :** plusieurs points viennent de recherches web et de communiqués, pas de la lecture intégrale des articles (Science 2014, Science Advances 2020). Les noms exacts des risques HRP sont à recopier depuis la page officielle.

## 5. Démonstration de cinq minutes

Fil conducteur : **un astronaute se surveille lui-même, l'équipage agit d'abord, la Terre confirme plus tard.**

| Temps | Ce qu'on montre | Ce qu'on dit |
|---|---|---|
| 0:00–0:30 | Écran station, contexte « Base Mars » | « Sur Mars, la Terre est à 20 minutes, et il n'y a pas de médecin. L'énoncé le dit : les astronautes doivent s'évaluer eux-mêmes. » |
| 0:30–1:45 | **Bilan en direct sur le téléphone**, idéalement saisi par un membre du jury. La silhouette se met à jour. On clique sur « Heart » puis sur « Bones ». | Pour chaque zone : sa fonction, la valeur mesurée, le danger HRP concerné, pourquoi cet examen, quoi faire. « Ce sont les cinq questions de l'énoncé. » |
| 1:45–2:50 | **Cas rouge** : fièvre à 39,5 °C et pouls à 115. Alerte équipage avec un conseil adapté à la gravité. Rapport Terre de moins de 600 caractères, compte à rebours accéléré. | « L'équipage applique la procédure maintenant. Seul ce qui est critique part vers la Terre, parce que la bande passante est rare. » |
| 2:50–3:50 | **L'étagère réelle** : on retire 3 boîtes, on scanne (~20 s), l'autonomie baisse. On relie à la zone « Digestive / nutrition ». | Pendant le scan : « L'IA tourne sur ce portable, sans réseau. Elle ne fait que compter. Un humain confirme les cases incertaines. » Si ça plante, on passe au scan rejoué. |
| 3:50–4:30 | Une diapositive « vrai / simulé / sources » | Logiciel, règles et IA locale : réels et testés. Équipage : simulé. Sources : HRP, ASC, NASA-STD-3001. Pas un dispositif médical. Code préparé avant l'événement, déclaré. |
| 4:30–5:00 | Bascule ISS / Lune / Mars en un clic | « Le même outil s'adapte à l'environnement. Ensuite : brancher de vrais capteurs et des examens par imagerie (l'énoncé cite l'échographie). » |

**Ce qui sort du scénario principal :** le simulateur de prévisions, la gamification et le calibrage. On les garde pour les questions.

**Questions à préparer :**
- Pourquoi ces seuils ?
- Que se passe-t-il si l'IA se trompe ?
- Pourquoi la nourriture dans un outil de santé ? Réponse : « inadequate nutrition » est cité par l'énoncé.
- Comment savez-vous que l'astronaute va bien s'il ne fait pas son bilan ? Il faut que P3 soit corrigé.
- Qu'avez-vous fait pendant le week-end ?

**Livrable NASA à part :** une vidéo de 30 s ou 7 diapositives, à préparer séparément de ce pitch de 5 minutes.

## 6. Tâches à donner à Fable

Contraintes :
- Aucune nouvelle fonctionnalité, pas de restructuration.
- Les 53 tests restent verts, et un test est ajouté par correction.
- `test_demo_e2e.py` (412 → 398) ne doit pas bouger.

1. **Exercice par jour civil.** Test : 7 bilans le même jour à 10 min donnent une série de 1 jour, pas de rouge, pas de message Terre.
2. **État « unknown ».** Un profil sans mesure ne doit plus afficher de vert. Côté serveur, la silhouette et le panneau affichent du gris avec « no data ». Test : nouveau profil → 8 zones `unknown`.
3. **Repas = portions réelles.** Test : manger une soupe retire 212 kcal, pas 44 944.
4. **Conseil selon le niveau et la valeur.** Le texte rouge doit différer de l'orange et inclure « inform the crew medical officer now ». Test : 37,5 °C et 39,5 °C donnent deux textes différents.
5. **Rapport Terre seulement pour les règles marquées « earth ».** Ajouter un champ `earth: true` par règle dans `thresholds.json`. **Les seuils critiques sont décidés par David et Massi**, pas inventés par l'IA. Test : une systolique de 140 seule ne crée pas de message Terre.
6. **Libellés scientifiques.** Renommer « Skin » en « Radiation exposure ». Ajouter un lien vers le risque HRP officiel dans chaque zone. Remplacer « 4–24 min » par « 3–22 min ». Citer Chang'e-4 pour la Lune. Retirer de « NASA Data » les valeurs inutilisées ou sans source.
7. **Documents.** Mettre `STATUS.md`, `CLAUDE.md` et `README.md` d'accord (iOS, HTTPS) et remplir les `[cite]` avec les sources de la section 4.

## Sources consultées

- [Défi officiel « health-monitoring-software »](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
- [NASA HRP — hazards](https://www.nasa.gov/hrp/hazards)
- [NASA OCHMO — radiation protection technical brief](https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf)
- [SwRI — RAD surface measurements](https://www.swri.org/press-release/swri-scientists-publish-first-radiation-measurements-surface-mars)
- [Scientific American — Radiation on Mars](https://www.scientificamerican.com/article/radiation-on-mars-managea/)
- [Hassler et al. 2014 (NTRS)](https://ntrs.nasa.gov/citations/20180007641)
- [Sci.News — Chang'e-4 lunar dose](https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html)
- [ASC — TBone](https://www.asc-csa.gc.ca/eng/sciences/tbone.asp)
- [PMC — revue sur la perte osseuse](https://pmc.ncbi.nlm.nih.gov/articles/PMC7200725)
- [NASA — SANS overview (NTRS)](https://ntrs.nasa.gov/api/citations/20230006218/downloads/Brunstetter%20-%20Crewmember%20SANS%20Overview%20-%20Export%20Control%20-FINAL%20-%2001May23.pdf)
- [NASA ASCEND — délais de communication Mars](https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays%2C%20Disruptions%2C%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf)
- [LiveScience — anciennes limites de radiation](https://livescience.com/why-astronauts-radiation-levels)
