# MASTER PROMPT — Build HESTIA (NASA Space Apps 2026)

You are the lead engineer on **HESTIA**, a fully offline health-monitoring and food-inventory system for astronauts, built for the NASA Space Apps Challenge 2026 (local edition, ESGI Paris, 14–15 Nov 2026). Build the **entire project** described below, end to end, working and demoable. Work autonomously in the phases of section 14. After each phase: run it, verify it, commit, and give me a 5-line status. Only stop to ask me if you are truly blocked.

Working language with me: **French**. Code, comments, commits, README, UI strings, NASA project page: **English**.

---

## 0. Hard rules (never violate)

1. **100 % offline at runtime.** No cloud API, no external CDN, no telemetry. All AI runs locally through Ollama (http://localhost:11434). Fonts and assets are bundled.
2. **Not a medical device.** Thresholds are *indicative*. No diagnosis, no drug names or doses. This is stated visibly in the app (footer/banner and in every advice panel).
3. **All crew data is fictional and labelled "SIMULATED"** wherever shown. The 4 astronauts are invented.
4. **No NASA logos**, no modified NASA marks. AI-generated images carry a watermark/caption.
5. Every number taken from an assumption (7 700 kcal/kg, bone-loss attenuation, solar-storm dose, supply windows for Moon/ISS) is **flagged as an assumption** in the UI (tooltip or "Assumptions" panel).
6. Keep it simple and demoable. Cut scope in this order if time runs out: **M5 forecasts → gamification → Earth-link animation**. **M1 (camera pantry) is never cut.**

## 1. Product

**HESTIA — Habitat Embedded System for Tracking Individual Astronaut health.**
Pitch: a Mars base has no doctor and no internet. HESTIA lets each astronaut self-assess their health. A camera reads the food shelf, tracks what is consumed, forecasts the evolution of bodies and stocks, and decides when to alert the crew or Earth despite the communication delay. All AI runs locally.

Challenge: *Create Health Monitoring Software for Astronauts on Space Missions* (NASA HRP's 5 hazards: radiation, isolation & confinement, distance from Earth, altered gravity, hostile closed environment). Health effects covered: immunity, bone loss, cardiovascular, **insufficient nutrition**, behavioural health. Required: a **visual** self-assessment tool with advice. The brief's own example is a **clickable human silhouette** showing each body part's status. It must answer: which measurements are feasible in space; why an exam is done; how hazards affect indicators; when to alert crew/ground; which preventive actions to suggest.

Judging criteria: Impact, Creativity, Validity, Relevance, Presentation. UI quality matters a lot.

## 2. Architecture

```
[Webcam] → STATION (MacBook = base "station")
   ├─ FastAPI + SQLite (SQLModel)
   ├─ Ollama: VLM (shelf counting) + small text LLM (advice, Earth report)
   ├─ Python engines: nutrition, alerts, forecasts
   └─ Desktop app: Tauri 2 + React   (apps/station)
          ▲  local WiFi (laptop hotspot = base network, no internet)
          ▼
   CREW mobile app: React + Capacitor (apps/crew), Android APK / iOS
```

Monorepo (pnpm workspaces), repo name `hestia`:

```
hestia/
├─ CLAUDE.md                 # project context for agents (summarise this prompt)
├─ README.md                 # English, run instructions, architecture, honesty notes
├─ apps/station/             # Tauri 2 + React + Vite + TS + Tailwind
├─ apps/crew/                # React + Vite + Capacitor (also runnable in a browser window as fallback)
├─ packages/ui/              # shared: Silhouette, charts, cards, status badges, tokens
├─ packages/api-client/      # typed fetch client + shared TS types (generated from OpenAPI if easy)
├─ server/
│  ├─ app/                   # FastAPI: routes, models, engines, seeds
│  ├─ vision/                # capture, crop, VLM call, diff, fixtures
│  ├─ data/                  # food catalogue, contexts, thresholds, NASA reference values
│  └─ pyproject.toml         # uv, Python 3.12
└─ docs/                     # pitch, demo script, NASA project page draft, slides outline, video script
```

Stack: React 18 + Vite + TypeScript + Tailwind, Recharts, hand-made SVG silhouette, Python 3.12 + FastAPI + SQLModel + SQLite, uv, OpenCV (`opencv-python`), Ollama HTTP API, pnpm workspaces. Provide a single command per part (`pnpm dev:station`, `pnpm dev:crew`, `uv run hestia-server`) and a root `make demo` / script that starts everything.

## 3. Environment already prepared (do not reinstall)

- MacBook Air M2, 16 GB RAM, macOS, Homebrew. Disk is tight: keep dependencies lean, avoid duplicating large files.
- Installed: Node 22.13, pnpm 10.14, Python 3.12.16, uv 0.13.7, Rust 1.98 (cargo), Xcode CLI tools, CocoaPods, Android Studio (Android SDK + Platform Tools may still need to be installed via SDK Manager: tell me, do not block on it).
- **Ollama is installed and serving** with `qwen2.5vl:7b` (vision) and `gemma3:4b`. Do not pull other large models without telling me.
- Test image of the shelf: `/Users/massinissabencherif/nasa/image.png` (generated, 12 compartments A1–C4, labels printed on the shelf edge). Copy it into `server/vision/fixtures/shelf_full.png` and use it as fixture and demo fallback.
- Ground truth for that image: A1 3 tomato-soup cans, A2 2 oatmeal boxes, A3 4 tuna cans (2×2 stacked), A4 empty, B1 5 cracker packs, B2 2 peanut-butter jars, B3 3 rice bags, B4 1 cereal box, C1 4 bean cans, C2 empty, C3 3 water pouches, C4 2 energy-bar boxes.
- **Measured vision results** (full image, one call, temperature 0, JSON mode): `gemma3:4b` answered "1" everywhere → **rejected**. `qwen2.5vl:7b` → valid JSON, **10/12 exact counts**, ~11 s warm (~48 s on first call because of model loading). Errors: A3 stacked cans counted 3 instead of 4; empty A4 hallucinated as 1.
- Therefore: use `qwen2.5vl:7b` for vision; `gemma3:4b` (or qwen text mode) for text advice to save disk and RAM. Preload with `keep_alive: "30m"` and a warm-up call at server start.

## 4. Module M1 — Camera pantry (TOP PRIORITY, polish it most)

**Shelf**: 12 numbered slots A1…C4 (3 rows × 4 columns). Each slot is assigned a catalogue item (`shelf_slot.food_item_id`) and a capacity. A QR code per slot is the fallback identification (optional, last priority).

**Capture**: OpenCV grabs a frame from the webcam (camera index configurable). Demo mode: a "Scan now" button; optional periodic scan every N minutes (default off). Also support loading a still image (`--image path`) and a **mock mode** that replays fixtures, so everything works without a camera or without Ollama.

**Reading pipeline** (`server/vision/`):
1. Capture/load the image, downscale to ≤ 1280 px wide.
2. **Per-slot crops**: crop the 12 compartments from a calibrated grid (normalised boxes in `server/data/shelf_grid.json`, editable via a **calibration screen** on the station: drag 4 corners or edit boxes; save to JSON). Default boxes must work for `image.png`.
3. For each crop, call Ollama `/api/generate` with `model=qwen2.5vl:7b`, `format="json"`, `stream=false`, `options.temperature=0`, `keep_alive="30m"`. Prompt constrains the answer to the catalogue ids of that slot plus `"empty"`, e.g. *"This image shows ONE shelf compartment. Count how many separate units of <item name> are visible, counting stacked units in every layer. If the compartment is empty, answer 0. Reply as JSON: {"count": int, "confidence": 0-1, "note": "..."}"*. Crops are independent: run them with bounded concurrency (2) or sequentially; the whole scan must stay **≤ 20 s warm**, otherwise fall back to a single full-image call (2 passes max).
4. Validate with Pydantic; on invalid JSON retry once; then mark the slot `confidence=0`.
5. **Low confidence (< 0.6) or count > capacity → ask for confirmation on screen** (inline editable count on the station). Confirmed values override and are stored with `source=manual`.
6. Store `inventory_snapshot` (+ image path, raw JSON) and `inventory_line`s.
7. **Diff** against the previous snapshot → `consumption_event`s (negative deltas). Positive deltas = restock events. If a crew member validated a meal on mobile within the last 10 min (see M2), attribute the event to them.
8. Emit a live update to connected clients (Server-Sent Events or WebSocket).

**Catalogue** (`food_item`): `id, name, kcal, protein_g, carbs_g, fat_g, mass_g, expiry` per unit. Seed the 12 items from the shelf with plausible values (per-unit kcal etc.), marked as simulated.

**Calculations** (`server/app/engines/nutrition.py`, unit-tested):
- BMR = **Mifflin-St Jeor**: men `10·kg + 6.25·cm − 5·age + 5`, women `… − 161`. Daily need = BMR × activity factor. NASA reference ≈ 12 000 kJ/day ≈ 2 870 kcal (display as comparison).
- **Autonomy (days)** = total kcal in stock / total daily need of the crew. Also per-macro autonomy and the next-expiry warning.
- **Rationing plans** to last X days: ration % (= stock kcal / (X · need)), per-astronaut macros, projected weight change (uses the 7 700 kcal/kg approximation, flagged), and a safety floor (warn below ~70 % ration; never propose below it without a red warning).
- Autonomy shown big on the station. Autonomy must update live after each scan (animated number transition: this is the **wow moment**: remove boxes → scan → autonomy drops).

**Station screen "Live pantry"**: the live photo with detection overlays per slot (count badge, confidence colour), a 3×4 grid of cards (item, count, trend), autonomy gauge, ration plan panel, consumption feed, "Scan now" button with progress (per-slot progress is nice), calibration entry.

## 5. Module M2 — Crew mobile app

- Profile picker among 4 fictional astronauts (names, sex, age, height, weight, activity factor, avatar).
- **Daily check-in**: blood pressure (sys/dia), heart rate, glucose (mg/dL), temperature, weight, sleep (h), mood 1–5, symptoms (multi-select chips), exercise minutes. Each field has a "how / why / what risk" explanation sheet.
- **Meal of the day** proposed from the real stock (items available, kcal/macros vs the astronaut's need) and an "I ate this" button that creates a `consumption_event` attributed to them (and decrements expected stock until the next scan).
- Reminders: measurements, resistive exercise (bone loss), hydration; adapted to the mission context.
- Gamification: streak, badges (e.g. "7-day streak", "Exercise hero", "Balanced meals"), crew score.
- History: per-indicator Recharts line charts with green/orange/red bands.
- Home: today's status + mini silhouette. Large, thumb-friendly, offline-capable UI. The API base URL is configurable (station LAN IP); show connection status.
- Must also run as a normal browser window at phone size (fallback if the APK build is blocked).

## 6. Module M3 — Clickable silhouette (high design priority)

Hand-made SVG body (front view) in `packages/ui`, with 8 clickable zones, each coloured green/orange/red from live data:
| Zone | Space hazard | Linked indicators |
|---|---|---|
| Brain / morale | isolation & confinement | mood, sleep, symptoms |
| Eyes (SANS) | altered gravity | symptoms (vision), manual eye-check note |
| Heart | altered gravity / cardiovascular | BP, heart rate |
| Bones | altered gravity | exercise minutes, resistive-exercise streak, mission-days model |
| Muscles | altered gravity | exercise minutes, weight trend |
| Immunity | stress / closed environment | temperature, sleep, symptoms |
| Skin | radiation | cumulative dose vs 600 mSv |
| Digestive / nutrition | closed environment | weight trend, kcal intake vs need, glucose |

Clicking a zone opens a panel: **function of the zone, linked indicators with current values, the HRP hazard concerned, advised action, indicative thresholds, "why this exam matters"**. Large on mobile; miniature per astronaut on the station crew view. Animate colour transitions. Accessibility: do not rely on colour alone (icon + label).

## 7. Module M4 — Alerts and Earth link

- Indicative thresholds in `server/data/thresholds.json` (displayed as "indicative"): e.g. systolic BP green 90–119, orange 120–139 or 80–89, red ≥140 or <80; heart rate (rest) green 50–90, orange 91–110 or 45–49, red >110 or <45; glucose green 70–99, orange 100–125 or 55–69, red ≥126 or <55; temperature green 36.1–37.2, orange 37.3–38.0, red >38.0 or <35.5; sleep green ≥7 h, orange 5–7, red <5; mood green 4–5, orange 3, red 1–2; weight change vs baseline orange >2 % loss, red >5 %; exercise below 30 min/day for 3 days orange, 7 days red; radiation red when projected career dose >100 % of 600 mSv.
- Level behaviour: **green** nothing. **Orange** self-care advice generated by the local LLM **with guardrails**: system prompt forbids diagnosis, drug names/doses, and certainty; must give ≤ 4 short steps, reference an onboard procedure (e.g. "see Procedure: …" from a small local list) and end with the disclaimer. Always return a **deterministic template fallback** if the LLM is slow (>8 s) or off. **Red**: alert for the crew (on-screen + mobile notification banner) **and** a message queued to Earth.
- **Earth report**: compact structured summary (who, indicator, value, trend 7 d, level, actions already taken, ≤ 600 characters + JSON). Stored in `earth_message` with `deliver_ts = created + one-way delay` of the active context (+ the reply delay for the simulated answer). Only **significant changes** are sent (de-duplicate; new level change or worsening trend).
- Station "Earth link" screen: outgoing queue with live **countdown**, arrival, then a scripted simulated ground reply (clearly labelled simulated). Add a time-scale factor (e.g. ×30) for demos.

## 8. Module M5 — Forecast simulator ("world model")

Sliders: mission duration, ration %, exercise h/day, resupply delay (days), solar storm (on/off + intensity). Computed curves (client or server; server preferred, `POST /api/forecast`), recalculated live:
- **Stocks**: days remaining, with the resupply window and the delay.
- **Weight**: energy balance, ≈ 7 700 kcal per kg (assumption flagged).
- **Bone mass**: −1 to −1.5 %/month in flight, attenuated by exercise (assumption: up to ~50 % attenuation at ≥ 2 h/day; flagged).
- **Cumulative radiation dose** vs the 600 mSv career limit; solar storm adds a configurable one-off dose (assumption flagged).
Present it honestly as a **simulator built on NASA reference values** that anticipates the effect of a decision. **It is not a trained model.** Show an "Assumptions & sources" drawer. Unit-test the engine.

## 9. Module M6 — Multi-environments

Context selector on the station; it changes delay, radiation, resupply, reminders and the silhouette risk texts:
| Context | Earth delay (one way) | Radiation | Resupply |
|---|---|---|---|
| Mars base | 4–24 min (default 20 min for demo) | 0.67 mSv/day (Curiosity RAD) | window every ~26 months |
| Earth–Mars transit | growing | 1.8 mSv/day | none |
| Moon base | ~1.3 s | 1.369 mSv/day | assumption: 6 months |
| ISS | ~0 | 0.523 mSv/day | assumption: 2–3 months |

Other reference values: O₂ ≈ 0.82 g/min/person; CO₂ ≈ 1.04 g/min/person; ISS water recycling 98 %; bone loss in flight 1–1.5 %/month. Put them in `server/data/nasa_reference.json` with source notes, and cite them in docs. **NASA's official challenge resources are published Fri 13 Nov**: leave a clearly marked `docs/nasa-resources.md` stub and make thresholds/reference values easy to update.

## 10. Data model (SQLite via SQLModel)

`mission_context(id, type, delay_s, radiation_msv_day, resupply_days)` · `crew_member(id, name, sex, age, height_cm, weight_kg, activity_factor, avatar)` · `food_item(id, name, kcal, protein_g, carbs_g, fat_g, mass_g, expiry)` · `shelf_slot(id, label, food_item_id, capacity)` · `inventory_snapshot(id, ts, image_path, raw_json)` + `inventory_line(snapshot_id, slot_id, count, confidence)` · `consumption_event(id, ts, food_item_id, qty, crew_member_id?)` · `measurement(id, ts, crew_member_id, type, value, unit, source[manual|camera|simulated])` · `alert(id, ts, crew_member_id, level, indicator, message, sent_to_earth)` · `earth_message(id, created_ts, deliver_ts, payload, status)` · `gamification(crew_member_id, streak, badges_json, score)`. Add migrations or a deterministic `reset-db` + `seed` command.

## 11. API (FastAPI, OpenAPI enabled, CORS open on LAN)

`GET /health` · `GET/PUT /api/context` · `GET /api/crew`, `GET /api/crew/{id}/status` (per-zone silhouette status) · `POST /api/crew/{id}/checkin` · `GET /api/crew/{id}/measurements?type=&days=` · `POST /api/crew/{id}/meal` · `GET /api/pantry` (slots, counts, autonomy) · `POST /api/pantry/scan` (modes: camera | image | mock) · `POST /api/pantry/confirm` · `GET/PUT /api/pantry/grid` (calibration) · `GET /api/pantry/consumption` · `GET /api/rations?days=` · `POST /api/forecast` · `GET /api/alerts` · `POST /api/alerts/{id}/ack` · `GET /api/earth/messages` · `POST /api/earth/advance` (demo time-skip) · `GET /api/events` (SSE) · `POST /api/demo/reset` · `POST /api/demo/scenario/{name}`. Bind `0.0.0.0` and print the LAN IP at start.

## 12. Simulated data

Seeded RNG (reproducible). 4 fictional astronauts with distinct profiles and 90 days of history generated from NASA-based values (weight drift, sleep, HR, BP, glucose, mood, exercise). Plant **scripted anomalies** for the demo: (a) one astronaut's *bone* zone goes **orange** after a low-exercise streak on today's check-in, and the app suggests an exercise routine; (b) one astronaut gets a **red** alert (e.g. fever + elevated HR) that triggers the Earth report. Every simulated measurement has `source=simulated` and the badge "SIMULATED" is visible. Demo scenarios endpoint reproduces the demo script reliably (`/api/demo/scenario/demo-mars`), including a starting stock giving ~412 days of autonomy.

## 13. UI/UX direction

Dark "mission control" feel, calm and legible, high contrast, large numbers for the key figures (autonomy, days to Earth reply). Tokens in `packages/ui` (colours, spacing, typography). Status colours green/orange/red are the only semantic colours; pair with icons. Station layout: left nav (Crew, Pantry, Forecasts, Alerts, Earth link, Mission settings), top bar with context + clock + connection + "SIMULATED / NOT A MEDICAL DEVICE". Smooth but light animation (the autonomy counter, silhouette colour change, countdown). Responsive for 1280×800 laptop and 390×844 phone. No lorem ipsum, real copy. Pay special attention to the **Live pantry** and **Silhouette** screens: they carry the jury's impression.

## 14. Phases (do them in order, verify each)

0. **Scaffold**: monorepo, CLAUDE.md, `/health`, both apps call it, run commands documented. *Check:* both apps display "server OK".
1. **Backend core**: models, seed, simulated data, catalogue, contexts, status engine, thresholds, API skeleton. *Check:* pytest passes, seeded DB reproducible.
2. **M1 vision**: pipeline with per-slot crops, mock mode, diff, SSE, `/api/pantry/*`, nutrition engine with tests. *Check:* run on `shelf_full.png` and print a table of detected vs ground truth; report exact-count score, latency, and what you changed to beat the 10/12 baseline (A3 stacks, A4 empty). Keep the per-scan time ≤ 20 s warm.
3. **Station UI**: crew view, Live pantry (overlay, autonomy, rations, calibration, wow animation).
4. **Crew mobile UI**: profile, check-in, meal, history, home.
5. **Silhouette + status mapping** (shared component, mobile big, station mini).
6. **Alerts + LLM advice with guardrails + Earth link** (queue, countdown, simulated reply).
7. **Forecasts (M5) + multi-environments (M6)**.
8. **Gamification, reminders, polish, empty/error states, offline behaviour** (server down, Ollama down → clear message + fallback).
9. **Mobile build**: Capacitor Android (and iOS if Xcode present); if blocked, document the browser-window fallback and move on.
10. **Docs & deliverables** (section 15).

Freeze features at the end of phase 8; phases 9–10 are packaging only. Commit after every phase with English messages, Conventional-Commit style. Never commit images larger than necessary or model files.

## 15. Deliverables (write them in `docs/`, English unless noted)

- `README.md`: what/why, architecture diagram, run instructions, honesty notes (simulator not trained model, simulated data, not medical, vision accuracy measured).
- **NASA project page** draft with sections **"NASA Data"** (every NASA value used + source + where in the code) and **"Use of AI"** (local Ollama VLM + LLM, what they do, what they don't, guardrails, AI-generated test image disclosed and watermarked; code assisted by AI).
- **Demo video script ≤ 30 s** with English subtitles (SRT), **or 7 slides max** outline (provide both).
- `docs/demo-script.md` (French, 3 min): 1) context: Mars base, 4 astronauts, Earth at 20 min, no internet; 2) astronaut check-in on mobile → bone zone turns orange, exercise advice; 3) pantry: remove 3 boxes live, scan, autonomy goes 412 → 398 days; 4) resupply delayed 60 days → rationing plan + projected weight curve; 5) simulated red alert → compact Earth report, arrives in 20 min, crew handles it meanwhile.
- `docs/risks.md`: vision slow/inaccurate → fixed slots + QR + VLM only counts; laptop heating → on-demand scan; mobile build blocked → browser window; flaky venue network → dedicated laptop hotspot.
- `docs/licenses.md`: open-source licences of dependencies and reused assets; repo licence MIT.

## 16. Definition of done

- [ ] `make demo` (or documented equivalent) starts server + station + crew browser view with seeded data; works with Wi-Fi off.
- [ ] Live scan on a real webcam image or fixture returns per-slot counts, confirmation prompt on low confidence, and autonomy updates live.
- [ ] Silhouette zones recolour from check-in data; panels show function, indicators, HRP hazard, action, thresholds.
- [ ] Red alert creates an Earth message with correct delay and countdown; orange advice shows guardrailed text or the fallback.
- [ ] Forecast sliders update the 4 curves; assumptions drawer present.
- [ ] Context switch changes delay/radiation/resupply visibly.
- [ ] "SIMULATED" and "NOT A MEDICAL DEVICE" visible everywhere required.
- [ ] Unit tests for nutrition, thresholds/status and forecast engines pass; one end-to-end smoke test of the demo scenario.
- [ ] README, NASA page draft, video script, slides outline written.
- [ ] No network call to any non-local host (verify with a grep and a run with Wi-Fi off).

Start with phase 0 now. Before writing product code, show me the commands you will run and the folder tree you will create (one short message), then proceed.
