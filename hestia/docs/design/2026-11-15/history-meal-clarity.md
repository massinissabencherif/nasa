# History and meals — 15 Nov

David approved this focused lot on `fix/meal-history-clarity`. Uncommitted.

## Observed problem and approach

History's wrapping nine-choice picker consumed much of the phone screen while the
latest value sat below the first chart. The two pressure charts were not clearly
labelled separately. More seriously, a slow request after selecting Weight kept
the old 118 blood-pressure reading under the new kg unit. This was reproduced in
Chrome with an intercepted delayed request, not inferred solely from source.

Use a compact, icon-labelled current choice opening the existing shared sheet;
name each pressure series; place the latest value, unit, timestamp and origin above
each curve. Values stay associated with their API/profile/type/range/retry query.
An error offers retry, empty data says empty, loading shows the shared small loader.
Cancelled/late requests cannot overwrite a newly selected query. The picker is an
extra tap, traded for keeping the readings visible. Ordinary scrolling remains.

Meal cards repeated large nutrition/stock blocks before the action. Projected
portion counts obscured the number of packages actually counted. Package counts
now stay visible; virtual units and macros are details. Logging is placed first.
The wording says catalogue unit, based on whole-package values, rather than
implying a personalised serving. This exposes an existing model limitation; there
is no fractional-portion implementation or medical nutrition recommendation.

These are anti-vibecode/human-brain-ux local design hypotheses. No user study or
improvement percentage is claimed. Same icons, colours, inputs, help and sheet
motion; no dependency or decorative animation. Page CSS stays with crew screens.

## Evidence

- [History before](history-before.png) and [after](history-after.png): same
  seeded local simulated records, 390×844. Both named pressure values and curves
  are visible; the secondary explanatory note can still need a small scroll.
- [Meal before](meal-before.png) and [after](meal-after.png): same preview stock,
  390×844. First card/count visible; further foods still use normal scrolling.
- Wrong-unit reproduction before: Weight title + newest **118 kg** while the
  delayed weight request was pending. After: loader, no old value or curve;
  selected-query value appears only after its own response.

## Verification

| Check | Result |
|---|---|
| Crew TypeScript/production build | Pass; pre-existing large JS/image warning remains |
| Existing crew tests | 16 pass, including latest reading, origin, check-in and reaction logic |
| Focused lint | Pass with one existing set-state-in-effect warning in useConnection, outside modified hook |
| Prettier / offline source / diff checks | Pass |
| History delayed weight query | Old pressure value disappears immediately; new kg value only after response |
| History 503 → retry → empty | Error distinct from no data; retry succeeds; no false prior value |
| History rapid Temperature → Weight | Late temperature response does not replace weight |
| Pressure view | Both series named; own latest value/date/origin shown, unit mmHg |
| Meal partial suggestion failure | First success appears in receipt, second failure does not; exact qty=1 payload retained |
| Meal load failure → retry → no stock | Useful error/retry and then genuine empty state |
| FR 390, EN 320 | No horizontal overflow in checked states |
| Picker keyboard / Escape / reduced motion | Open, close and restore focus to picker; existing shared behaviour preserved |

Chrome on David's Mac. Regression states used intercepted API responses, not
actual health/meal mutations. Final screenshots used real read-only preview GETs.
No DB reset, no station/backend changes, no full backend rerun. A full physical
phone → station → meal/stock rehearsal is still outstanding.

## Limits and handoff

A unit can represent an entire rice package (e.g. 1800 kcal), not a ready-to-eat
personal portion. Multi-food saves are still separate server calls. A timeout
after the server writes may be uncertain; the user must check before retrying.
This pass does not add idempotency or atomic multi-food transactions.

The [Claude brief](../../prompt/2026-11-15-claude-parcours-avant-jury-fr.md) lists all
flows and concrete success/failure criteria, including these limitations and
Massi's Simulator/Earth ownership. Prepared, not sent. Full audit not claimed done.

At David's request Ollama was also restarted locally. Existing qwen2.5vl:7b answered
Ready and HESTIA reports running/installed/loaded. This is availability/warmup,
not evidence that a new photograph is counted accurately.
