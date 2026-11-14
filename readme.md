# HESTIA — brief projet (NASA Space Apps 2026, ESGI Paris)

> Fichier de contexte pour Claude Code. Le placer à la racine du repo sous le nom `CLAUDE.md`.
> Langue de travail : français. Code, commits, README et page projet NASA : anglais.

---

## 0. Règles pour l'assistant

- Avancer **étape par étape** et attendre la confirmation avant de passer à l'étape suivante.
- Donner des blocs de commandes **complets et copiables** (machine : MacBook Air M2, 16 Go, macOS, Homebrew).
- Être **direct et honnête** sur les risques, et couper ce qui ne tient pas dans le temps.
- Réponses courtes pendant le hackathon.
- Ne jamais présenter l'app comme un dispositif médical.
- **Tout doit tourner hors ligne** : aucune API cloud dans le produit.

---

## 1. Le contexte

- **Événement** : NASA Space Apps Challenge 2026, édition locale ESGI Paris.
- **Dates** : samedi 14 et dimanche 15 novembre 2026, de 9 h à 22 h. Nuit sur place possible.
- **Équipe** : 2 devs web, code assisté par IA.
- **Prix local** : 3 équipes gagnantes, 5 000 € au total.
- **Soumission NASA globale** : avant le **15 nov. à 23 h 59** (heure locale).
- **Jury** (critères NASA) : Impact, Créativité, Validité, Pertinence, Présentation.
- **Conférence sur place** : la startup Présage parle des World Models.

### Défi choisi : *Create Health Monitoring Software for Astronauts on Space Missions*

Page : https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/ (niveau intermédiaire)

**Les ressources NASA officielles du défi sortent le vendredi 13 novembre.** Il faudra les intégrer le jour J.

Résumé de l'énoncé (paraphrase) :
- Le Human Research Program (HRP) de la NASA identifie **5 dangers** :
  - radiations ;
  - isolement et confinement ;
  - distance de la Terre ;
  - gravité modifiée ;
  - environnement clos hostile.
- **Effets sur la santé** : immunité, perte osseuse, problèmes cardiovasculaires, **nutrition insuffisante**, santé comportementale.
- **Objectif** : un **outil visuel** qui permet à l'astronaute **d'évaluer lui-même sa santé** et qui lui donne des **conseils** (traitement, amélioration).
- **Entrées libres** : clavier, clics, **images caméra**. Toute donnée qui représente un indicateur de santé est acceptée.
- **Questions à traiter** :
  - Quelles mesures sont faisables dans l'espace ?
  - Pourquoi un examen ?
  - Comment les dangers affectent les indicateurs ?
  - Quand alerter l'équipage ou les médecins au sol ?
  - Quelles actions préventives proposer ?
- **L'interface compte**. L'énoncé donne l'exemple d'une **silhouette humaine cliquable** qui affiche l'état de chaque partie du corps.
- **Pistes facultatives** :
  - plusieurs environnements (vaisseau, station, rover, base) ;
  - rappels de routine ;
  - gamification ;
  - graphiques dans le temps ;
  - code couleur ;
  - explications simples.

---

## 2. Le produit : HESTIA

*Habitat Embedded System for Tracking Individual Astronaut health*

**Pitch** : une base sur Mars n'a ni médecin ni internet. HESTIA permet à chaque astronaute d'évaluer lui-même sa santé. L'app suit les réserves de nourriture par caméra, prévoit l'évolution du corps et des stocks, et décide quand prévenir la Terre malgré le délai de communication. **Toute l'IA tourne en local.**

**Périmètre** : complet, les 6 modules. Si le temps manque, le module **garde-manger caméra** passe en premier.

### Architecture

```
[Webcam] → POSTE FIXE (MacBook = "station" de la base)
           ├─ API FastAPI + SQLite
           ├─ Ollama : VLM (comptage étagère) + LLM (conseils, rapport Terre)
           ├─ Moteurs Python : nutrition, alertes, prévisions
           └─ App desktop Tauri (React)
                 ▲  WiFi local (hotspot du laptop = réseau de la base, pas d'internet)
                 ▼
           APP MOBILE astronaute (React + Capacitor → Android APK / iOS)
```

### Stack

| Couche | Choix |
|---|---|
| Front | React + Vite + TypeScript + Tailwind, composants partagés |
| Desktop | Tauri 2 |
| Mobile | Capacitor (Android et/ou iOS selon les téléphones de l'équipe) |
| Graphiques | Recharts |
| Silhouette | SVG fait main |
| Backend | Python 3.12, FastAPI, SQLite (SQLModel), uv |
| Vision | OpenCV (capture webcam) + Ollama VLM (`qwen2.5vl:7b` ou `gemma3:4b`, choisi à l'étape 1) |
| LLM conseils | Ollama, petit modèle texte |
| Monorepo | pnpm workspaces |

### Structure du repo cible

```
hestia/
├─ CLAUDE.md
├─ apps/
│  ├─ station/      # Tauri + React (desktop)
│  └─ crew/         # Capacitor + React (mobile)
├─ packages/
│  └─ ui/           # composants partagés (silhouette, charts, cartes)
├─ server/
│  ├─ app/          # FastAPI : routes, modèles, moteurs
│  ├─ vision/       # capture + appel VLM + diff
│  ├─ data/         # catalogue aliments, seeds, ressources NASA
│  └─ pyproject.toml
└─ docs/            # démo, pitch, page projet
```

---

## 3. Les modules

### M1 — Garde-manger caméra ⭐ PRIORITÉ 1

- **L'étagère** : étagère physique avec des **emplacements numérotés** (A1…C4), plus un QR code par emplacement en secours.
- **Capture** : la webcam (OpenCV) prend une photo toutes les N minutes. En démo, un bouton « scanner maintenant » suffit.
- **Lecture** : le VLM reçoit la photo et le catalogue, puis renvoie ce JSON :
  `[{slot, item_id, count, confidence}]`
  Si la confiance est faible, l'app demande une confirmation à l'écran.
- **Consommation** : on compare avec le scan précédent pour obtenir les événements de consommation. Ils sont attribués à un astronaute s'il a validé un repas sur mobile.
- **Catalogue** : `item_id, name, kcal, protein_g, carbs_g, fat_g, mass_g, expiry`.
- **Calculs** :
  - Besoin journalier = métabolisme de base (Mifflin-St Jeor) × facteur d'activité. Référence NASA : environ 12 000 kJ/j, soit environ 2 870 kcal.
  - **Jours d'autonomie** = kcal en stock / besoin journalier de l'équipage.
  - **Plans de rationnement** pour tenir X jours : % de ration, macros par astronaute, et impact sur le poids (calculé dans M5).
- **Moment wow** : on retire une boîte, le scan tourne et l'autonomie baisse en direct.

### M2 — App mobile astronaute

- Choix du profil parmi 4 astronautes fictifs.
- **Check-in quotidien** : tension, fréquence cardiaque, glycémie (mg/dL), température, poids, sommeil, humeur (1–5), symptômes.
- Repas du jour proposé par M1, avec un bouton « j'ai mangé ».
- Rappels de routine : mesures, exercice contre la perte osseuse.
- Gamification : série de jours, badges, score d'équipage.
- Historique : graphiques par indicateur avec code couleur.
- Chaque mesure a une explication simple : comment la prendre, pourquoi, quel risque elle surveille.

### M3 — Silhouette cliquable

- **Zones** : cerveau/moral, yeux (SANS), cœur, os, muscles, immunité, peau (radiations), système digestif (nutrition).
- Chaque zone a une couleur (vert, orange ou rouge) et un panneau qui montre :
  - la fonction de la zone ;
  - les indicateurs liés ;
  - le risque spatial correspondant parmi les 5 dangers du HRP ;
  - l'action conseillée.
- Affichage en grand sur le mobile, en miniature par astronaute sur la station.

### M4 — Alertes et liaison Terre

- Chaque indicateur a des **seuils indicatifs**, affichés comme tels.
- Selon le niveau :
  - **vert** : rien à faire ;
  - **orange** : conseil d'auto-prise en charge, généré par le LLM local avec garde-fous (pas de diagnostic, renvoi vers une procédure) ;
  - **rouge** : alerte pour l'équipage et message vers la Terre.
- **Rapport Terre** : un résumé compact mis en file d'attente, avec le délai du contexte de mission et un compte à rebours.
- Un écran « Terre » montre l'arrivée du message, puis la réponse simulée.
- Seuls les changements significatifs partent vers la Terre, car la bande passante est limitée.

### M5 — Prévisions (simulateur « world model »)

- **Curseurs** : durée de mission, % de ration, heures d'exercice par jour, retard de ravitaillement, tempête solaire.
- **Courbes calculées** :
  - **Stocks** : jours restants.
  - **Poids** : bilan énergétique, environ 7 700 kcal par kg. C'est une approximation, à signaler.
  - **Masse osseuse** : −1 à −1,5 % par mois, atténuée par l'exercice. C'est une hypothèse, à signaler.
  - **Dose de radiation cumulée** : comparée à la limite de carrière de 600 mSv.
- On le présente honnêtement comme un **simulateur fondé sur des valeurs NASA**, qui anticipe l'effet d'une décision. Ce n'est pas un modèle entraîné.

### M6 — Multi-environnements

| Contexte | Délai Terre (aller) | Radiation | Ravitaillement |
|---|---|---|---|
| Base Mars | 4–24 min | 0,67 mSv/j (Curiosity RAD) | fenêtre tous les ~26 mois |
| Transit Terre–Mars | croissant | 1,8 mSv/j | aucun |
| Base lunaire | ~1,3 s | 1,369 mSv/j | hypothèse : 6 mois |
| Station (ISS) | ~0 | 0,523 mSv/j | hypothèse : 2–3 mois |

Le contexte choisi modifie le délai, les radiations, le ravitaillement et les rappels.

**Autres valeurs utiles** :
- O₂ consommé : environ 0,82 g/min par personne.
- CO₂ rejeté : environ 1,04 g/min par personne.
- Recyclage de l'eau sur l'ISS : 98 %.
- Perte osseuse en vol : 1 à 1,5 % par mois.

---

## 4. Modèle de données (SQLite)

- `mission_context(id, type, delay_s, radiation_msv_day, resupply_days)`
- `crew_member(id, name, sex, age, height_cm, weight_kg, activity_factor, avatar)`
- `food_item(id, name, kcal, protein_g, carbs_g, fat_g, mass_g, expiry)`
- `shelf_slot(id, label, food_item_id, capacity)`
- `inventory_snapshot(id, ts, image_path, raw_json)` + `inventory_line(snapshot_id, slot_id, count, confidence)`
- `consumption_event(id, ts, food_item_id, qty, crew_member_id?)`
- `measurement(id, ts, crew_member_id, type, value, unit, source[manual|camera|simulated])`
- `alert(id, ts, crew_member_id, level, indicator, message, sent_to_earth)`
- `earth_message(id, created_ts, deliver_ts, payload, status)`
- `gamification(crew_member_id, streak, badges_json, score)`

## 5. Écrans

**Mobile (astronaute)**
- Accueil : état du jour et mini silhouette
- Check-in
- Silhouette
- Repas
- Historique
- Badges

**Station (desktop)**
- Vue équipage
- Garde-manger en direct : photo, détections, autonomie, rations
- Prévisions
- Centre d'alertes
- Liaison Terre
- Paramètres mission

## 6. Données

- **Simulées** : 4 astronautes fictifs avec 90 jours d'historique générés à partir des valeurs NASA. On y place 1 ou 2 anomalies scénarisées pour la démo. L'étiquette « simulé » doit être visible partout.
- **Manuelles** : le check-in mobile.
- **Caméra** : l'étagère réelle.
- **NASA** : les ressources officielles publiées le 13 nov., et les risques du HRP.

---

## 7. Planning

**Avant le hackathon (cette semaine)** : seulement de l'installation et des tests. **Il faut vérifier les règles de l'ESGI sur le code préparé à l'avance** avant d'écrire du code produit.

**Samedi 14**

| Heure | Dev A (station / backend / IA) | Dev B (mobile / UI) |
|---|---|---|
| 9–10 | Lecture des ressources NASA | idem |
| 10–13 | API + base + données simulées | Squelette mobile + check-in |
| 14–18 | Pipeline vision (capture → VLM → JSON → diff) | Silhouette SVG + statuts |
| 18–22 | Moteur nutrition (autonomie, rations) | Écrans garde-manger + vue équipage |
| Nuit | Alertes + liaison Terre (optionnel) | |

**Dimanche 15**

| Heure | Dev A | Dev B |
|---|---|---|
| 9–12 | Moteur de prévisions | Écran prévisions (curseurs + courbes) |
| 12–15 | Conseils LLM + rapport Terre | Gamification, multi-env, finitions |
| 15–17 | **Gel des fonctionnalités**, démo de bout en bout, build mobile | idem |
| 17–20 | Vidéo ≤ 30 s, slides ≤ 7, page projet EN (sections *NASA Data* + *Use of AI*), README | idem |

Soumission globale avant 23 h 59. **L'horaire du jury local est à confirmer.**

## 8. Script de démo (3 min)

1. Le contexte : base sur Mars, 4 astronautes, Terre à 20 min, pas d'internet.
2. Un astronaute fait son check-in sur mobile. La zone « os » de la silhouette passe à l'orange, et l'app propose un conseil d'exercice.
3. Garde-manger : on retire 3 boîtes en direct. Le scan tourne et l'autonomie passe de 412 à 398 jours.
4. Prévision : le ravitaillement est retardé de 60 jours. L'app propose un plan de rationnement et affiche la courbe de poids projetée.
5. Une alerte rouge simulée part vers la Terre sous forme de rapport compact. Il arrivera dans 20 min. En attendant, l'équipage la gère à bord.

## 9. Garde-fous

- Ce n'est **pas un dispositif médical**. Les seuils sont indicatifs, il n'y a pas de diagnostic, et c'est écrit dans l'app.
- Les données sont fictives et étiquetées comme telles. Les astronautes sont inventés.
- Toute l'IA est locale, et son usage est déclaré sur la page projet.
- On n'utilise ni ne modifie les logos NASA.

## 10. Risques et plans B

| Risque | Plan B |
|---|---|
| VLM lent ou imprécis | Emplacements fixes + QR codes, le VLM ne fait que compter. Sinon, un modèle plus petit. |
| MacBook Air qui chauffe et ralentit | Scan à la demande en démo, pas en continu |
| Build mobile bloqué | L'app mobile tourne sur le laptop en mode fenêtre |
| Réseau du salon instable | Hotspot dédié du laptop |
| Manque de temps | On coupe dans cet ordre : M5 → gamification → animation liaison Terre |

---

## 11. Étapes de mise en route

### Étape 1 — Tester la vision locale (le plus gros risque)

```bash
# Installer et lancer Ollama
brew install ollama
ollama serve &

# Télécharger deux modèles vision à comparer
ollama pull qwen2.5vl:7b
ollama pull gemma3:4b

# Prendre une photo d'une étagère avec quelques aliments → ~/shelf.jpg
# Test rapide en CLI
time ollama run qwen2.5vl:7b "List every food item visible on this shelf and how many of each. Answer ONLY with JSON: [{\"item\":\"...\",\"count\":0}]" ~/shelf.jpg
time ollama run gemma3:4b "List every food item visible on this shelf and how many of each. Answer ONLY with JSON: [{\"item\":\"...\",\"count\":0}]" ~/shelf.jpg

# Même test via l'API (c'est ce que le backend utilisera), JSON forcé
curl -s http://localhost:11434/api/generate -d "{
  \"model\": \"qwen2.5vl:7b\",
  \"prompt\": \"List every food item visible on this shelf and how many of each. Answer as JSON: {\\\"items\\\":[{\\\"item\\\":\\\"...\\\",\\\"count\\\":0}]}\",
  \"images\": [\"$(base64 -i ~/shelf.jpg)\"],
  \"format\": \"json\",
  \"stream\": false
}" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['response']); print('durée (s):', r['total_duration']/1e9)"
```

**À noter pour chaque modèle** : temps de réponse, exactitude des comptes, JSON propre (oui/non).
**Décision** : on garde le modèle le plus juste en moins de 20 s. Si les deux se trompent souvent, on passe aux QR codes par emplacement.

### Étape 2 — Installer les outils

```bash
# Node + pnpm
brew install node
corepack enable && corepack prepare pnpm@latest --activate

# Python + uv
brew install python@3.12 uv

# Rust (pour Tauri) + outils Xcode en ligne de commande
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Mobile : Android Studio (contient un JDK) — et/ou Xcode depuis l'App Store pour iOS
brew install --cask android-studio
brew install cocoapods   # seulement si on cible iOS

# Vérifications
node -v && pnpm -v && python3.12 --version && uv --version && rustc --version
```

Ensuite, ouvrir Android Studio et installer **Android SDK + Platform Tools** avec le SDK Manager.

### Étape 3 — Tester le réseau

- Activer le partage de connexion du Mac (Réglages → Général → Partage → Partage Internet) ou un hotspot téléphone.
- Lancer `python3 -m http.server 8000` sur le Mac.
- Ouvrir `http://<IP-du-Mac>:8000` depuis les deux téléphones. Pour connaître l'IP : `ipconfig getifaddr en0`.

### Étape 4 — Scaffolding (seulement si l'ESGI autorise le code préparé, sinon samedi 10 h)

Premier prompt à donner à Claude Code :
> Lis CLAUDE.md. Crée le monorepo décrit au §2 (pnpm workspaces : apps/station en Tauri 2 + React + Vite + TS + Tailwind, apps/crew en React + Capacitor, packages/ui partagé, server en FastAPI + SQLModel avec uv). Implémente uniquement le squelette : une route `/health` côté serveur, une page d'accueil par app qui l'appelle. Donne-moi les commandes pour lancer chaque partie. On valide avant d'aller plus loin.

---

## 12. Livrables NASA

- Démo : **vidéo de 30 s max** (sous-titres anglais) **ou 7 slides max**. Une démo plus longue rend le projet inéligible au jury global.
- Page projet en anglais, avec les sections **NASA Data** et **Use of AI**.
- Lien public sans login (repo GitHub ou site).
- Code, données et images réutilisés : cités et sous licence ouverte. Images générées par IA : avec un filigrane.
- Règles vérifiées sur la version 2025. **La version 2026 est à vérifier dans le Project Submission Guide.**