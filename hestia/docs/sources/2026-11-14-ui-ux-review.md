# UI and UX review of 14 Nov 2026

Done with the `hestia-ui-polish` and `hestia-ux-research` skills on the
real screens (crew app at 390 × 844, station at 1280 × 800, seeded data,
demo scenarios replayed). **No user was observed.** Every friction below
was seen by the reviewer in a replay; none is a user-test result.

## Level chosen: light

The screens were already disciplined: one accent, no gradient or glow, one
icon family, monospaced figures, status shown as colour, icon and word. The
work is on hierarchy and on saying things once, not on a new look.

## Changes

| Observed friction | Relevant finding | Change | Trade-off | Check |
|---|---|---|---|---|
| An advice was one block of text: the measured value, the steps and the disclaimer had the same weight | W3C cognitive accessibility pattern "Use Clear Step-by-step Instructions": clear instructions help prevent errors and let people act without asking for help. Basis: accessibility guidance (supplemental to WCAG, not a conformance requirement) | `AdviceText`: the finding first and larger, the steps as a numbered list, notes, then the disclaimer in small text | The disclaimer is quieter than before; it is still on every advice and in the footer of every screen | Screenshots before and after, station Alerts and crew Home |
| The crew app said twice that a report went to Earth, in two wordings | Local hypothesis: two sentences for one fact make the reader look for a difference | The second sentence was removed; the advice already says it with the delay | None found | Screenshot of the crew Home with a red alert |
| Check-in fields showed the last value as a placeholder: an empty field looked filled | Nielsen Norman Group, "Placeholders in Form Fields Are Harmful": users can take a placeholder for a value already entered. Basis: expert practice; the summary of the article was read, not its full text | The placeholder is a dash; the last value stays under the label as "last: …" | The last value is slightly less prominent | Screenshot of the check-in form |
| The save button was below ten fields | Local hypothesis: the one action that matters should not need a scroll | The save button stays at the bottom of the screen while the form scrolls | It covers a strip of the form | Screenshot of the check-in form |
| A station crew card said "nominal" twice | Local hypothesis | The status is said once; the second line only lists zones that need attention | None found | Screenshot of the station Crew screen |
| The station opened on the pantry; the phone home screen gave room to streak and badges | Product decision D3, not research | The station opens on Crew; navigation is health first; streak and badges are in a collapsed section | Gamification is one tap further away | Screenshots |

## Still average

- The station Crew screen has empty space under the four cards until a card
  is opened.
- The crew home silhouette is tall: its legs carry one zone for a third of
  the screen.
- `PantryScreen.tsx` and the crew `Pantry.tsx` still write most styles
  inline; they were not touched.

## Not verified

No real phone, no real user, no screen reader, no reduced-motion setting.

## Sources

- W3C, Cognitive Accessibility Design Pattern: Use Clear Step-by-step
  Instructions — <https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions>
- W3C, About Supplemental Guidance — <https://www.w3.org/WAI/WCAG2/supplemental/about>
- Nielsen Norman Group, Placeholders in Form Fields Are Harmful —
  <https://www.nngroup.com/articles/form-design-placeholders/>
- Method: unslop by Damir Sokolovsky (CC BY 4.0) —
  <https://github.com/heydamir/unslop>
