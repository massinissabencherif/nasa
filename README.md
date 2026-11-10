# HESTIA

Offline health-monitoring and food-inventory system for astronauts.
Built for NASA Space Apps Challenge 2026 (ESGI Paris local edition).

All crew data is **simulated**. This is **not a medical device** — thresholds
are indicative only. See `CLAUDE.md` and `docs/prompt/` for the full spec.

## Architecture

```
[Webcam] → STATION (MacBook)
   ├─ FastAPI + SQLite (SQLModel)
   ├─ Ollama: local VLM (shelf counting) + local LLM (advice, Earth report)
   ├─ Python engines: nutrition, alerts, forecasts
   └─ Desktop app: Tauri 2 + React   (apps/station)
          ▲  local WiFi (laptop hotspot = base network, no internet)
          ▼
   CREW mobile app: React + Capacitor (apps/crew)
```

## Prerequisites

Node 22+, pnpm 10+, Python 3.12, [uv](https://docs.astral.sh/uv/), Rust
(for Tauri), [Ollama](https://ollama.com) running locally with `qwen2.5vl:7b`
pulled.

## Run

```bash
# install JS workspace deps once
pnpm install

# server — FastAPI on 0.0.0.0:8000
cd server && uv sync && uv run hestia-server

# station — Tauri desktop app (separate terminal)
pnpm dev:station

# crew — mobile app, also runs as a plain browser window
pnpm dev:crew
```

Check: `curl http://localhost:8000/health` → `{"status":"ok",...}`. Both the
station window and the crew page should show "server OK".

## Repo layout

```
hestia/
├─ CLAUDE.md          # project context for agents
├─ apps/station/      # Tauri 2 + React + Vite + TS + Tailwind
├─ apps/crew/         # React + Vite + Capacitor
├─ packages/ui/       # shared silhouette, charts, cards, tokens
├─ packages/api-client/
├─ server/            # FastAPI + SQLModel + SQLite, uv
└─ docs/              # spec, status, demo script, NASA project page
```

## Status

See `docs/STATUS.md` for current phase and what works.
