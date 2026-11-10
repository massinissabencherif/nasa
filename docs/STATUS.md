# HESTIA — status

## Phase 4 — Crew mobile UI (done)

**Backend additions this phase**:
- `GET/POST /api/crew/{id}/meal`: real implementation, replacing the phase-1
  stub. Proposals use the catalogue's *raw* per-unit kcal (e.g. a tomato soup
  can is ~212 kcal) — deliberately **not** the `units_per_lot` demo-scale
  multiplier used for whole-stock autonomy, since a person doesn't eat 212
  real rations in one sitting. Eating logs a `ConsumptionEvent` so autonomy
  drops immediately, before the next camera scan confirms it physically
  (`current_stock()` now folds in any consumption events newer than the
  latest snapshot).
- Scan-vs-meal reconciliation: if a crew member logged a meal in the last 10
  minutes, the next scan's diff for that item subtracts the already-logged
  quantity instead of double-counting it (PROMPT_FABLE.md §4 step 7).
- `GET /api/thresholds` exposes the indicative bands so the mobile charts
  draw the *same* green/orange/red zones the backend status engine uses —
  one source of truth, not a hand-copied duplicate.
- New tests (`test_nutrition.py`): raw-vs-demo-scale kcal, meal decrementing
  pending stock, per-crew-member kcal-eaten-today isolation. 24 passed.

**Design system additions** (`packages/ui`): `TabBar` (bottom nav, for
thumb reach) alongside the existing `NavRail`; new icons (home, check-in,
meal, history, info). Chart colors came from the **dataviz skill**, not
picked by eye — ran `validate_palette.js` against our actual panel surface
(`#161d27`): the hand-picked status green/orange/red and a new ice-blue
failed the categorical lightness/CVD checks, so all three status colors
were swapped for the validated steps (`#0ca30c` / `#fab219` / `#d03b3b`,
visually still read as green/orange/red) and a validated blue/magenta pair
(`--chart-series-1/2`) was adopted for the two-line blood-pressure chart —
applied as design tokens, so station's existing badges/overlays pick up the
more rigorous colors for free.

**Crew app** (`apps/crew`, React + Vite + Capacitor, configurable API base
stored in `localStorage` so it also runs as a plain browser window pointed
at the station's LAN IP): HashRouter + bottom tab bar (Home, Check-in, Meal,
History), profile picker (4 fictional astronauts) gating the rest of the
app, phone-width layout (max 480px, tested at 390×844) that still centers
reasonably in a full browser window.
- **Home**: per-zone status list (silhouette stand-in, same data phase 5's
  SVG will consume), a check-in prompt, light reminders for anything not
  logged today.
- **Check-in**: every field has an info toggle with how/why/risk copy tied
  to the specific HRP hazard it monitors; symptom chips are multi-select.
- **Meal**: today's kcal progress bar, available items from the real stock
  with "I ate this" — verified live that it moves the Pantry autonomy
  number immediately.
- **History**: Recharts line per indicator with green/orange/red
  reference bands computed from `/api/thresholds` (not hardcoded), a
  two-series chart for blood pressure.
- **Settings**: station address field + connection status.

**Verified visually again via Chrome DevTools Protocol** (no browser
extension available) at the 390×844 target. This caught two real bugs,
both fixed and reverified:
1. A seed bug carried over from phase 3 review wasn't new, but the chart
   work surfaced a **second, unrelated bug**: Y-axis tick labels were
   unreadable garbage ("00001") on any chart whose domain wasn't a round
   number. Root cause: no `tickFormatter`, so Recharts rendered the raw
   JS float (`127.88000000000001`) and the long string overflowed off
   the left edge of the chart — only invisible once gridlines aligned,
   which is why it wasn't caught by code review alone. Fixed with a
   `tickFormatter` that rounds to 1 decimal.
2. Confirmed the mood threshold band (orange only at exactly 3) renders
   correctly from the generic band-reconstruction algorithm, which proves
   that algorithm handles `eq` rules correctly, not just `gte`/`lte` ranges.

## Known gaps / not yet done

- Silhouette SVG (M3) still not built — both station Crew and crew-app Home
  show a zone list. Phase 5 replaces the *visual* only; the underlying
  `CrewStatus` data contract is already final and consumed in two places.
- Gamification (streak/badges/score) has a seeded `Gamification` table and
  no UI yet — phase 8, as planned.
- Mobile build (Capacitor Android/iOS) untouched — phase 9. Capacitor's
  cleartext/LAN config was already pre-set in phase 0.

## Next

Phase 5 — Silhouette + status mapping: the shared SVG body component in
`packages/ui`, big on mobile, miniature per astronaut on the station.
