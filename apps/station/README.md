# HESTIA station

Desktop interface of the base computer: Tauri 2 shell around a React + Vite
app. Screens: Crew, Pantry (+ calibration), Forecasts, Alerts, Earth link,
Mission settings.

- `pnpm --filter station tauri dev` (or `make station`) opens the desktop window.
- `pnpm dev:station` (or `make station-web`) serves the same UI at
  http://localhost:1420 for a browser.

It talks to the HESTIA server on `http://localhost:8000` (see
`src/lib/api.ts`) and listens to `/api/events` (SSE) for live updates. If the
server is down, it shows how to start it and reconnects by itself.
