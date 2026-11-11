# HESTIA — project context

HESTIA (Habitat Embedded System for Tracking Individual Astronaut health) is an
offline health-monitoring and food-inventory system for astronauts, built for
NASA Space Apps Challenge 2026 (ESGI Paris local edition, 14–15 Nov 2026).
Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*.

The full spec lives in `docs/prompt/PROMPT_FABLE.md` and
`docs/prompt/PROMPT_ADDENDUM.md` (the addendum overrides the fable wherever
they conflict). Re-read both, plus this file, at the start of every phase.
Current progress is tracked in `docs/STATUS.md` — keep it up to date.

## Hard rules

1. 100% offline at runtime: no cloud API, no external CDN, no telemetry. All
   AI runs locally through Ollama (`http://localhost:11434`).
2. Not a medical device. Thresholds are indicative only — no diagnosis, no
   drug names/doses. State this visibly in the app and every advice panel.
3. All crew data is fictional and labelled "SIMULATED" wherever shown.
4. No NASA logos or modified NASA marks. AI-generated images carry a
   watermark/caption.
5. Every assumption-derived number (7700 kcal/kg, bone-loss attenuation,
   solar-storm dose, resupply windows, …) is flagged as an assumption in the UI.
6. Keep it simple and demoable. Cut order if time runs out: M5 forecasts →
   gamification → Earth-link animation. M1 (camera pantry) is never cut.

## Key decisions (addendum overrides)

- **Demo scale**: a real 29-unit shelf must plausibly represent ~412 days of
  autonomy for 4 crew, and removing the 3 demo-script boxes ≈ −14 days. This
  works via `food_item.units_per_lot` (one physical unit = one storage lot of
  N rations) — shown in the UI as "1 box = 1 lot of N rations, demo scale".
- **One Ollama model in RAM at a time** (16 GB machine): never keep
  `qwen2.5vl:7b` and `gemma3:4b` loaded together. Text advice defaults to a
  deterministic template; the LLM path is opt-in and uses `qwen2.5vl:7b` in
  text mode (not `gemma3:4b`). No cold model load may happen during a scan.
- **Vision** (re-measured 11 Nov, see `docs/vision-benchmark.md`): a call costs
  ~14 s to encode any *new* image plus ~0.06 s per output token, so the default
  is ONE call on the whole shelf (768 px) with a JSON schema of one integer per
  slot: ~19 s, 11/12 on the test photo. "Accurate mode" = 3 row crops, ~50 s.
  Timings on a re-scanned (cached) image look 3x faster: never quote those.
  The model's own confidence was always 1.0, so `confidence` is a plausibility
  score computed in code; stacked slots (A3) always ask for confirmation.
  `gemma3:4b` answered "1" everywhere on vision: rejected.
- **Demo state**: the seed ends yesterday and is all green. Anomalies are
  triggered live (crew check-in) or via `POST /api/demo/scenario/{low-exercise,
  red-alert,shelf-removal,demo-mars}`; all go through `engines/checkin.py` or
  the scan route. Do not bake anomalies back into the seed.
- **Forecast**: `engines/forecast.py` is pure (no DB). "Next cargo in N days"
  per context is a demo assumption stored in `nasa_reference.json`.
- The crew app is built and served by the server at `/crew/` (same origin as
  the API); phones poll every 5 s instead of using SSE.
- Crew app reaches the station over plain HTTP on the LAN (no TLS). Capacitor:
  Android `androidScheme: "http"`, `cleartext: true`, `usesCleartextTraffic`;
  iOS needs an ATS local-networking exception + `NSLocalNetworkUsageDescription`.
  SSE should be verified from a real device; fall back to polling if it fails.
- Do not assume macOS can host an internet-less hotspot — document a tested
  setup (phone hotspot, mobile data off, or a travel router).
- Camera access and incoming-connection firewall prompts need a manual click;
  flag it instead of blocking.
- Pre-event work is allowed by the local organisers; keep git history honest
  and list on the NASA project page what was built before 14 Nov.

## Architecture

```
[Webcam] → STATION (MacBook)
   ├─ FastAPI + SQLite (SQLModel)                     server/
   ├─ Ollama: VLM (shelf counting) + text LLM (advice)
   ├─ Python engines: nutrition, alerts, forecasts
   └─ Desktop app: Tauri 2 + React                     apps/station/
          ▲  local WiFi (laptop hotspot, no internet)
          ▼
   CREW mobile app: React + Capacitor                  apps/crew/
```

Monorepo (pnpm workspaces), shared code in `packages/ui` (silhouette, charts,
cards, tokens) and `packages/api-client` (typed fetch client + shared types).

## Run

- `make demo` — builds the crew app, starts the server and the station window.
- `make test` — 52 backend tests incl. the end-to-end demo smoke test.
- Server alone: `cd server && uv run hestia-server` (`0.0.0.0:8000`, prints
  the LAN IP; `HESTIA_RELOAD=1` for auto-reload; the DB schema changes need
  `make reset`).
- Station in a browser: `pnpm dev:station` → http://localhost:1420.
- Crew: http://localhost:8000/crew/ (built) or `pnpm dev:crew` (Vite).
- UI checks without a browser extension: headless Chrome over CDP worked well
  (navigate, click, screenshot at 1280x800 and 390x844).

## Working language

With the human: French. Code, comments, commits, README, UI strings, and the
NASA project page: English.
