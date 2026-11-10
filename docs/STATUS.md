# HESTIA — status

## Phase 1 — Backend core (done)

- SQLModel models for the full data model (§10): `MissionContext`,
  `CrewMember`, `FoodItem` (+ `units_per_lot` demo-scale field), `ShelfSlot`,
  `InventorySnapshot`/`InventoryLine`, `ConsumptionEvent`, `Measurement`
  (+ optional `note` for symptom labels), `Alert` (+ `acked`), `EarthMessage`,
  `Gamification`.
- `server/data/`: `thresholds.json` (indicative bands for every §7 indicator,
  diastolic BP and the radiation warning band flagged as assumptions not in
  the brief), `nasa_reference.json` (4 mission contexts + §9 reference
  values, sourced), `food_catalogue.json` (10 catalogue items + the 12-slot
  shelf grid matching the `image.png` ground truth, `units_per_lot=212`).
- Deterministic seed (`uv run hestia-reset-db`, seed `20261114`): 4 fictional
  astronauts, 90 days of per-indicator history each, scripted anomalies —
  Chen Wei's 3-day low-exercise streak (bones/muscles → orange) and Sofia
  Lindqvist's fever + elevated HR today (heart/immunity → red, with a queued
  `EarthMessage`, delivery = now + mars_base delay). Reproducibility and both
  anomalies are covered by tests.
- Thresholds + status engines (`app/engines/`): per-indicator green/orange/red
  banding, exercise-streak banding, and per-zone aggregation for the 8
  silhouette zones (M3) — verified live against both scripted anomalies via
  `GET /api/crew/{id}/status`.
- API skeleton wired in `app/main.py`: `/health`, `/api/context` (GET/PUT),
  `/api/crew`, `/api/crew/{id}/status`, `/api/crew/{id}/measurements`,
  `/api/crew/{id}/checkin`, `/api/pantry` (read-only), `/api/pantry/grid`
  (GET/PUT), `/api/pantry/consumption`, `/api/alerts` (+ ack),
  `/api/earth/messages`, `/api/demo/reset`, `/api/demo/scenario/{name}`,
  `/api/events` (SSE skeleton with a `publish_event()` hook for phase 2).
  Stubbed with HTTP 501 (not yet implemented, says why): `/api/pantry/scan`,
  `/api/pantry/confirm`, `/api/crew/{id}/meal`, `/api/rations`,
  `/api/forecast`, `/api/earth/advance`.
- Tests: `uv run pytest` — 12 passed (thresholds banding, seed reproducibility,
  both scripted anomalies, and a demo-scale check that the seeded stock gives
  380-440 days of autonomy and the A1 slot alone is worth 10-18 days — the
  ~412 → ~398 numbers from the demo script).

## Known gaps / not yet done

- Ollama still not running on this machine — needed before phase 2.
- Android SDK/Platform Tools presence not yet verified.
- No vision pipeline yet (phase 2) — pantry/scan, pantry/confirm return 501.
- No nutrition engine yet (phase 2) — pantry autonomy/rations, meal return 501.
- No forecast engine (phase 7), no LLM advice/Earth-advance (phase 6).

## Next

Phase 2 — M1 vision: capture/crop pipeline, mock mode, diff → consumption
events, SSE push, `/api/pantry/scan`+`/confirm`, nutrition engine (BMR,
autonomy, rationing) with unit tests. Benchmark per-slot vs row vs full-image
crops on `shelf_full.png` before picking a strategy (addendum #3).
