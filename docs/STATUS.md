# HESTIA — status

## Phase 2 — M1 vision + nutrition engine (done)

**Vision benchmark** (`uv run python -m vision.benchmark`, `qwen2.5vl:7b`, warm,
against `shelf_full.png`, ground truth = 29 units across 12 slots). Per
PROMPT_ADDENDUM.md #3, concurrency was measured, not assumed — per-slot
concurrency gave wildly inconsistent timings (166s one run, 25s another, same
prompt/model) and never got close to 20s reliably, so it was dropped:

| strategy | calls | latency (warm) | exact count |
|---|---|---|---|
| per-slot, sequential | 12 | 183.6s | 9/12 |
| per-slot, concurrency=2 | 12 | 25.1s–166.7s (unstable across runs) | 9/12 |
| full image | 1 | 34.5s | 10/12 (A3 stack, C3 miscounted) |
| **row crops (chosen)** | 3 | **16.2–16.3s** | **11/12** (only A3 stacked tuna cans, 2 instead of 4) |

Row crops win on both axes: fastest *and* most accurate, and they fix the
baseline's A4-empty hallucination (section 3 of the brief) by giving the
model each empty slot's real neighbours as context instead of judging it in
isolation. The one remaining miss, A3's stacked tuna cans, persisted across
every prompt rewrite tried (generic stacking hint, explicit "front row +
back row" example) — a genuine depth-perception limit of this model at this
resolution, not a prompt problem, and it's the same slot the original fable
baseline already flagged. Documented as a known limitation rather than
hidden. Implementation: `server/vision/pipeline.py` (row strategy, one retry
per row on malformed JSON, confidence<0.6 or count>capacity flagged for
on-screen confirmation), prompts/strategy picked by `vision/benchmark.py`.

**Wired end-to-end** via `POST /api/pantry/scan?mode=mock|image|camera`:
creates an `InventorySnapshot` + `InventoryLine`s, diffs against the previous
snapshot into `ConsumptionEvent`s (verified live: removing the 3 slot-A1 cans
via a synthetic second fixture, `shelf_after_removal.png`, produced `qty=-3`
for tomato soup and dropped autonomy from 412.7 → ~398 days as designed — a
side effect of the A3 miscount also showed up honestly as a spurious `qty=-2`
tuna event, i.e. vision errors do propagate into consumption tracking, which
is realistic and worth knowing about before the live demo). `mock` mode
replays the fixture's ground truth with zero latency and no Ollama
dependency, for a reliable demo fallback. `POST /api/pantry/confirm`
overrides a slot's count/source to manual. `GET/PUT /api/pantry/grid` reads
and edits slot capacity/food mapping (crop-box editing is the phase 3
calibration screen, not yet built). Scans publish an SSE event on
`/api/events`. Ollama is warmed (`keep_alive=30m`) once in the background at
server startup so the first real scan isn't cold.

**Nutrition engine** (`server/app/engines/nutrition.py`, unit-tested):
Mifflin-St Jeor BMR × activity factor per crew member; `autonomy_report()`
(stock kcal via `food.kcal * units_per_lot * count`, days = stock / daily
need, next-expiry warning); `rationing_plan(days)` (ration %, per-astronaut
daily kcal, projected weight change at 7700 kcal/kg, `below_safety_floor`
flag under 70%). Wired into `GET /api/pantry` (autonomy) and `GET /api/rations`
(ration plan) — both 501s from phase 1 are now real.

**Tests**: `uv run pytest` — 21 passed (thresholds, seed/anomalies, nutrition
BMR/autonomy/rationing boundaries, vision schema + catalogue sanity). The
scan route itself was verified manually end-to-end against the real VLM
(not covered by an automated test — would need mocking Ollama's HTTP API,
judged not worth it for the time budget).

## Known gaps / not yet done

- Android SDK/Platform Tools presence not yet verified.
- Calibration screen (drag corners / edit `shelf_grid.json` boxes from the
  station UI) not built — phase 3.
- Meal-based consumption attribution (`crew_member_id` on `ConsumptionEvent`)
  stays `None` until M2's "I ate this" button exists.
- `POST /api/crew/{id}/meal` still 501 pending the station/crew UI that would
  drive it.
- No station/crew UI yet at all (phases 3–4) — everything above is API-only,
  exercised via curl.
- Forecast simulator (phase 7), LLM advice + Earth link (phase 6), gamification
  (phase 8) untouched.

## Next

Phase 3 — Station UI: crew view, Live pantry screen (photo + overlay, autonomy
gauge with the "wow" animated drop, ration panel, consumption feed, Scan now
button, calibration entry point).
