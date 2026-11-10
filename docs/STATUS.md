# HESTIA — status

## Phase 3 — Station UI (done)

**Design system** (`packages/ui`): dark "mission control" theme per §13 — bundled
IBM Plex Sans/Mono (local `.woff` files, no Google Fonts CDN call — checked
with `document.fonts`, confirmed offline-safe and in the production bundle),
an ice-blue accent kept separate from the mandated green/orange/red status
semantics, hairline borders instead of card shadows. Shared components:
`Panel`, `StatusBadge`/`StatusDot` (icon + color, never color alone),
`ReadoutNumber` (animated mono counter, respects `prefers-reduced-motion`),
`NavRail`, `TopBar`. Hand-drawn line icons in `icons.tsx` (no icon-library
dependency). `packages/api-client` now has a typed method per backend
endpoint used by the UI.

**Station app** (`apps/station`, React + Vite + Tauri, HashRouter):
- Shell: left nav (Crew, Pantry, Forecasts, Alerts, Earth link, Mission
  settings) + top bar (context, Earth delay, SIMULATED / not-a-medical-device
  tags, connection status, clock).
- **Live pantry** (the hero screen): shelf photo with confidence-colored crop
  overlays sourced from the *same* `shelf_grid.json` the vision pipeline
  uses, animated autonomy readout (the "wow" number), ration-plan panel with
  a live day selector, consumption feed resolved to item names, and a
  3×4 slot grid. "Scan now" offers mock / both fixtures / camera, and shows
  live per-row progress via the `/api/events` SSE stream added this phase.
  Verified end-to-end against the real VLM: selecting the after-removal
  fixture correctly dropped autonomy 412.7 → 393.4 and populated the
  consumption feed with real item names.
- **Calibration** screen: same shelf image, click a slot, drag sliders for
  its `[x0,y0,x1,y1]` crop box, save — backed by two new endpoints,
  `GET/PUT /api/pantry/grid-boxes`.
- **Crew**, **Alerts**, **Earth link**, **Mission settings** screens are
  fully wired to real data (status engine, alerts/ack, queued Earth messages
  with a live countdown, context switcher). **Forecasts** is an honest
  one-line placeholder (phase 7).
- New backend support for this phase: `GET /api/pantry/snapshot-image`
  (serves the latest scan's photo), per-row `scan_row_done` SSE events,
  `food_item_id`/`needs_confirmation` added to the pantry API response.

**Verified visually**: no Chrome extension available this session, so the
UI was driven and screenshotted via Chrome's DevTools Protocol directly
(launched with `--remote-debugging-port`, screenshots over the CDP
websocket) — every screen, the full scan flow (mock and real-VLM), and the
1280×800 minimum layout were actually rendered and inspected, not just
code-reviewed.

**Bug found and fixed while reviewing screenshots**: the seeded weight
random walk (`σ=0.15 kg/day` over 90 days) was large enough that 3 of 4
"baseline" astronauts crossed the 2%-weight-loss caution threshold just by
chance, on almost every seed — muddying the two intentional scripted
anomalies. Reduced to `σ=0.045`; re-verified Chen Wei (bones/muscles) and
Sofia Lindqvist (heart/immunity red) are now the clearly dominant signals,
with only minor single-day noise left on the others (realistic, not
systemic). All 21 backend tests still pass; this doesn't change the earlier
autonomy/demo-scale numbers (weight isn't part of that calculation).

## Known gaps / not yet done

- `apps/crew` (mobile) untouched — phase 4.
- Silhouette SVG (M3) not built — Crew screen shows a zone list stand-in;
  phase 5 will replace it with the real clickable body component, reusing
  the same `CrewStatus` data already flowing through `useCrewStatuses`.
- Forecasts screen is a placeholder; Earth link's countdown is real but the
  simulated ground reply and time-scale factor are phase 6.
- No gamification, no reminders, no offline/error-state polish yet (phase 8).
- Calibration screen edits box coordinates only, not slot→item/capacity
  mapping (that already has a working API — `PUT /api/pantry/grid` — just no
  UI yet; low priority since the seeded mapping is correct).

## Next

Phase 4 — Crew mobile UI: profile picker, daily check-in, meal-of-the-day,
history charts, home screen; must also run as a plain browser window.
