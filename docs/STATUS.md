# HESTIA — status

## Phase 5 — Silhouette + status mapping (done)

**Backend**: `GET /api/crew/{id}/latest` — most recent value per measurement
type, one query, used to show real numbers (not just colors) in the zone
panel. 26 tests pass (2 new).

**Shared component** (`packages/ui`, consumed by both apps — exactly the
"shared component, mobile big, station mini" brief): `SilhouetteBody` is a
hand-made SVG figure built from flat polygons/ellipses (not an imported body
asset), with 8 independently-clickable zones mapped onto distinct anatomical
regions chosen for a real reason, not arbitrarily:

| Region | Zone | Why there |
|---|---|---|
| Head | Brain / morale | obvious |
| Eyes | Eyes (SANS) | obvious |
| Neck | Immunity | lymph nodes / thymus |
| Chest | Heart | obvious |
| Arms | Skin | radiation on exposed surface |
| Abdomen | Digestive / nutrition | obvious |
| Pelvis | Bones | hip/spine density is the most-cited spaceflight bone-loss metric |
| Legs | Muscles | classic atrophy region |

Each zone fills with the live green/orange/red status (`fill` transitions
over 300ms) and — accessibility requirement, not optional — a non-green zone
also gets a small icon badge (▲/✕, the same glyphs as `StatusBadge`) so
nothing depends on color alone. Clicking (or Enter/Space on a focused zone)
opens `ZoneDetailPanel`: function, HRP hazard, each linked indicator with
its live value *and* status icon, indicative thresholds formatted from the
live `/api/thresholds` data (not hand-copied — verified it correctly
renders both ordinary range rules and the oddball ones, mood's `eq` rule
and exercise_streak's non-numeric band), a "why this matters" line, and a
guardrailed action box with the "not a diagnosis" disclaimer, shown only
when the zone isn't green.

Station's Crew screen shows a 32px mini silhouette per astronaut inline in
the collapsed row (instant at-a-glance read of all 4 crew), and a 150px
interactive one when a row is expanded, auto-selecting the worst zone.
Crew app's Home shows one big (190px) interactive silhouette with the panel
appearing inline below it.

**Chart colors** (carried from phase 4): reused as-is, no changes needed —
the dataviz-validated status palette already is the silhouette's fill
palette (same CSS tokens).

**Verified visually via Chrome DevTools Protocol** (still no browser
extension): clicked zones on both apps, confirmed live indicator values and
correctly-formatted thresholds render (e.g. Sofia's real heart rate 121.4
bpm showing red under Heart, Alex's real mood 3 showing orange under Brain),
confirmed the mini-silhouette-inside-a-toggle-button doesn't fire its own
click handler (it's `interactive={false}`, so a click there correctly just
bubbles to the row's expand/collapse toggle instead of crashing or
double-firing).

## Known gaps / not yet done

- No animation when a *scan* or *check-in* changes a zone's level live in
  front of the user in this session (the fill transition fires on next
  fetch/re-render, which already covers the real use case — this just
  wasn't specifically re-demonstrated this phase).
- Gamification (phase 8), forecast simulator (phase 7), LLM advice + Earth
  link polish (phase 6), mobile build (phase 9) all still pending as planned.

## Next

Phase 6 — Alerts + LLM advice with guardrails + Earth link: queue, live
countdown (already partly done in phase 3), simulated ground reply, and the
guardrailed local-LLM orange-advice path with a deterministic fallback.
