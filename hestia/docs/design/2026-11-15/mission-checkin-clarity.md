# Mission context and check-in — 15 Nov

Approved by David on `fix/reaction-zone-clarity`; not committed/pushed.

## Design review

Light visual pass using hestia-ui-polish, anti-vibecode and human-brain-ux.
The observed friction was concrete: mission choices did not explain the scenario,
confirmation moved content, and the projection buried useful numbers under prose.
A first explanatory version still occupied too much height; David asked to compact
it and place provenance under the QR. The final order is facts, goal, optional detail.
This is a local UX hypothesis checked for layout/behaviour, not a usability study.

- Same dark palette, shared tokens, Space Grotesk/monospaced numbers and illustrations.
- Mission descriptions are shared bilingual product copy. Scenario goals do not
  claim to be NASA objectives. Live API context supplies dates/delays.
- No extra step for choosing a mission. The active choice is a no-op; saving/failure
  stays in its card. No false successful change on a failed request.
- Pantry prioritises autonomy, next cargo and deficit/margin. The multiplier is
  still visible. Full calculation/nutrient details and mission goal are available
  below. The existing simulator/delay callbacks are untouched for Massi.
- Shortfalls round up to whole days; this aligns the displayed deficit with the
  floored stock duration, without changing server arithmetic.
- Sheets remain opaque during entry; transform, close animation, Escape, focus
  restoration and reduced motion remain. No new JS animation/dependency.
- Crew uses an astronaut helmet rather than a generic person.
- Check-in retains its three steps, same questions, shared inputs/help and request
  builder. Measurements are grouped and paired where space allows; 320px uses one
  column. Review translates individual symptoms/mood, not a concatenated sentence.
- Saved result separates storage success, indicative health state and absent data.
  The clinical meaning and server rules do not change. O7 (skipped/no symptoms)
  remains open; the UI does not silently introduce a new answer.

## Captures

- [Settings, 1280×800](mission-settings-compact.png): current local scenario,
  23px residual vertical scroll; mission numbers and QR visible. Smaller laptops
  and stacked tablet layouts retain scrolling rather than shrinking touch targets.
- [Projection, 1280×900](mission-projection-compact.png): intercepted Mars context,
  seeded inventory. Presentation evidence, not a real food-autonomy measurement.
- [Check-in measurements, 390×844](checkin-measures-compact.png).
- [Saved state, 390×844](checkin-result-compact.png): intercepted orange/unknown
  fixture. No real health event or server mutation.

## Checks on David's Mac

| Check | Outcome / limit |
|---|---|
| Crew + station build | Pass; existing large JS chunks/images remain |
| Focused Oxlint | New components/screens pass; two existing hot-refresh warnings in icons.tsx |
| Formatting / offline-source check | Prettier and `make check-offline` pass; no non-local application URL |
| Check-in logic | 4 existing tests pass; same builder, empty and zero-value semantics |
| Settings | Four mocked mission changes, current-choice no-op, failed PUT retaining selection; button positions stable once fonts/layout settled |
| Keyboard/motion | Mission button remains focusable; sheet Escape restores trigger, reduced motion disables entry |
| Compact station layout | 1280×800: 23px scroll; 1024×768: 139px; 820×1180 stacked: 171px. No horizontal page overflow |
| Projection | 820/1280 widths; opaque entry, objective disclosure, multiplier and main figures present |
| Check-in | FR 390/320/820; failed save retains answers, retry sends exact original payload; empty save disabled |
| English result | Mood review translated; all-unknown state never says normal |

Test traffic for mission/check-in mutations was intercepted. The existing
8011 disposable database was read only, never reset. Initial harness failures
included a layout measurement before fonts settled, reselecting the current real mission
while expecting a save, and a case-sensitive symptom expectation. Corrected
checks passed. No broad backend or whole-project test rerun for this UI-only lot.

## Limits and next work

The reported white frame was not reproduced in Chrome. Opaque entry reduces a
possible transparency flash, but Safari/Tauri remain unverified. Physical tablet,
real camera/products, the full phone save/meal/photo flow and Massi's computer
still need rehearsal. David confirms that the phone now opens the app over LAN;
that is narrower evidence than a full successful phone workflow.

Existing manifest and iOS metadata request standalone display after installation;
no service worker/offline guarantee or actual installed-phone check was added.
Installation and caching are separate concerns ([MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)).

Massi owns guided Simulator/history. Claude's Earth-link work remains in a separate
worktree. Delivery/pitch/source reconciliation, onboarding and the remaining page
polish are tracked in STATUS and the open-request register, not implicitly done.
