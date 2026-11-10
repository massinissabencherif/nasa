# HESTIA — status

## Phase 0 — Scaffold (done)

- Monorepo created at `~/nasa/hestia` (pnpm workspaces: `apps/station`,
  `apps/crew`, `packages/ui`, `packages/api-client`, `server/`).
- `CLAUDE.md` written from `~/nasa/readme.md` + the two prompt files.
- `docs/prompt/PROMPT_FABLE.md` and `docs/prompt/PROMPT_ADDENDUM.md` copied in.
- Server: FastAPI + SQLModel via uv, `/health` returns `{"status":"ok"}`.
  Run: `cd server && uv run hestia-server`.
- Station: Tauri 2 + React + Vite + TS + Tailwind, home page calls `/health`
  and shows "server OK" / "server unreachable". Run: `pnpm dev:station`.
- Crew: React + Vite + Tailwind + Capacitor initialised (`com.hestia.crew`,
  `androidScheme: "http"`, `cleartext: true` pre-set for LAN HTTP), home page
  calls `/health` the same way. Run: `pnpm dev:crew`. No Android/iOS platform
  added yet (planned phase 9).
- Verified: server health check OK via curl; station and crew dev builds
  pending a browser/window check (next step below).

## Known gaps / not yet done

- Ollama is installed but **not currently running** on this machine
  (`pgrep ollama` empty). Needs `ollama serve` before phase 2 (vision).
- Android SDK/Platform Tools presence not yet verified.
- No backend models/seed/migrations yet (phase 1).
- No vision pipeline yet (phase 2).

## Next

Phase 1 — backend core: SQLModel models, seed data, simulated 90-day
history, catalogue, mission contexts, status/threshold engine, API skeleton.
