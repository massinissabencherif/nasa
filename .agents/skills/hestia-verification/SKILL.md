---
name: hestia-verification
description: Check that a HESTIA change really works and report honestly what was and was not verified. Use before saying a task is done, before a commit, and before the demo rehearsal. Covers backend tests, type checks, the browser path and the demo scenario.
---

# HESTIA verification

Compiling is not working. Check the behaviour a user would see, then say
exactly what you ran and where.

## Method

1. **Backend.** From `hestia/server`: `uv run pytest -q`, or
   `.venv/bin/python -m pytest -q` when `uv` is not installed.
2. **Types and build.** From `hestia/`: `pnpm --filter crew exec tsc -b`,
   `pnpm build:crew`, `pnpm build:station`.
3. **Behaviour through the API**, on a throwaway database: set
   `HESTIA_DB_PATH` to a temporary file, start
   `python -m uvicorn app.main:app --port 8000` from `hestia/server`, and
   replay the case with real requests. Never experiment on
   `server/hestia.db`.
4. **Real screens.** Crew app: `http://127.0.0.1:8000/crew/` at 390 × 844.
   Station: `pnpm --filter station preview --port 1420` at 1280 × 800. Use
   Playwright, or headless Chrome over the DevTools protocol, and look at
   the screenshots. The crew profile is the `hestia-crew-id` key of
   `localStorage`.
5. **Demo scenario.** Replay `hestia/docs/demo-script.md` step by step,
   including the fallbacks of `hestia/docs/risks.md`.
6. **Offline rule.** `make check-offline`.

## What only a person with the hardware can check

Say so instead of guessing: the vision model on a real shelf, the webcam,
a physical phone on the base network, the Tauri window, a run with Wi-Fi
off.

## Result

A table: check, machine, result. Then two lists: "verified" and "not
verified", and the next action. Update `hestia/docs/STATUS.md` with it. Do
not write "works on Massi's machine" or "works in Codex" unless it was run
there.
