# HESTIA — architecture and technical choices

How the code is organised and why. Rules for agents are in
[`AGENTS.md`](../../AGENTS.md); run instructions are in the
[README](../README.md).

## Overview

```
[Webcam] → STATION (MacBook)
   ├─ FastAPI + SQLite (SQLModel)                     server/
   ├─ Ollama: VLM (shelf counting) + text LLM (advice)
   ├─ Python engines: nutrition, alerts, forecasts
   └─ Desktop app: Tauri 2 + React                     apps/station/
          ▲  local Wi-Fi (no internet)
          ▼
   CREW mobile app: React + Capacitor                  apps/crew/
```

Monorepo (pnpm workspaces). Shared code is in `packages/ui` (silhouette,
charts, cards, tokens) and `packages/api-client` (typed fetch client and
shared types).

## Boundaries

- `server/app/engines/` holds the rules: status, thresholds, alerts, advice,
  nutrition, forecast, gamification, check-in. `forecast.py` is pure (no
  database). The others read through a SQLModel session.
- `server/app/routes/` exposes them over HTTP.
- `server/vision/` captures a frame, calls the local model and scores the
  answer. It knows nothing about the database.
- `server/data/` holds every number that can change without a code change:
  `thresholds.json`, `nasa_reference.json`, `food_catalogue.json`,
  `shelf_grid.json`.
- Every check-in — phone form, demo scenario, test — goes through
  `engines/checkin.py::record_checkin`.

## Technical choices that still hold

- **Demo scale of the shelf.** A real 29-unit shelf stands for about 412
  days of food for 4 crew, through `food_item.units_per_lot`: one box is one
  storage lot of N rations. The UI says so.
- **One Ollama model in memory** (16 GB machine): `qwen2.5vl:7b` for vision
  and, when opted in, for advice text. `gemma3:4b` was rejected for vision
  and is not used at runtime. No cold model load during a scan.
- **Advice text** comes from fixed templates by default. The LLM path is
  opt-in and its output is checked in code.
- **Vision** (measured 11 Nov, see [vision-benchmark.md](vision-benchmark.md)):
  one call on the whole shelf at 768 px with a JSON schema of one integer per
  slot, about 19 s. "Accurate mode" is three row crops, about 50 s. Timings on
  a cached image look three times faster: never quote those. The model's own
  confidence was always 1.0, so `confidence` is a plausibility score computed
  in code. Stacked slots always ask for confirmation.
- **Demo state.** The seed ends yesterday and is all green. Anomalies are
  triggered live by a check-in or by
  `POST /api/demo/scenario/{low-exercise,red-alert,shelf-removal,demo-mars}`.
  Do not put anomalies back into the seed.
- **Forecast.** "Next cargo in N days" per context is a demo assumption
  stored in `nasa_reference.json`.
- **Crew app delivery.** The server builds and serves the crew app at
  `/crew/`, same origin as the API. Phones poll every 5 s; the station uses
  server-sent events.
- **Network.** The server listens on plain HTTP (`:8000`) and on HTTPS
  (`:8443`, self-signed certificate for the LAN address). HTTPS exists
  because Safari only allows the in-page camera on a secure page. Capacitor:
  Android uses cleartext HTTP; iOS needs the local-network keys.
- **Base network.** Do not assume macOS can host a hotspot without internet.
  The tested setups are listed in [risks.md](risks.md).
- **macOS prompts.** Camera access and the incoming-connection firewall
  prompt need one manual click before the demo.

## Known structural debts

Recorded on 14 Nov, not yet addressed:

- `apps/station/src/screens/PantryScreen.tsx` (665 lines) and
  `apps/crew/src/screens/Pantry.tsx` (441 lines) mix data loading, state and
  layout, with most styles written inline instead of using the shared tokens.
- `server/app/routes/pantry.py` (518 lines) mixes HTTP handling, stock
  calculations and database writes.
- `engines/status.py` hard-codes the 600 mSv limit that also lives in
  `nasa_reference.json`.
