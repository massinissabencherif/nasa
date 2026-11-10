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
- **Vision model**: `qwen2.5vl:7b` for counting (10/12 exact on the fixture
  image, ~11 s warm). `gemma3:4b` answered "1" everywhere on the vision task —
  rejected for vision, reused only for text if ever needed.
- Benchmark per-slot vs row vs full-image crops on `server/vision/fixtures/shelf_full.png`
  before committing to a strategy; Ollama may serve requests serially, so
  measure instead of assuming concurrency helps. Stay ≤ 20 s warm per scan.
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

- Server: `cd server && uv run hestia-server` (FastAPI on `0.0.0.0:8000`,
  prints the LAN IP; `/health` returns `{"status":"ok"}`).
- Station: `pnpm dev:station` (Tauri dev window; set `TAURI_DEV_HOST` to also
  serve the Vite dev server on the LAN).
- Crew: `pnpm dev:crew` (Vite dev server bound to `0.0.0.0`; open from a phone
  on the same LAN, or in a desktop browser as a fallback for the APK build).

## Working language

With the human: French. Code, comments, commits, README, UI strings, and the
NASA project page: English.
