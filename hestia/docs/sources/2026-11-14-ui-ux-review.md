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

## Second pass: the two screens the jury looks at longest

Same direction (mission control at night, exact, instrument-like). Nothing
decorative was added: both changes show data the station already had.

| Observed friction | Change | Trade-off | Check |
|---|---|---|---|
| Station Crew: four small cards and half the screen empty; to read one value you had to open a card and click a zone | A crew board: two columns, a larger silhouette, and five readings per astronaut (heart rate, blood pressure, temperature, sleep, reaction) with their level, plus the age of the last reading | Five readings are a choice; the others stay one click away | Screenshot with one orange and one red crew member |
| Earth link: the path of the message was a thin line under the text, and the screen said "725 characters sent" while the report text is limited to 600 | The path is the first thing on the card: base, Earth, the share of the delay already elapsed, quarter marks, the sending and arrival times, and the countdown beside it. The findings are a small table. The character count is now the report text's own | The raw JSON size is no longer shown | Screenshots in the three states: on its way, reply on its way, reply received |
| After "skip ahead", a reply could be shown as received before the report was sent | The time skip now moves the sending time too (server), with a test | None | `test_demo_script_end_to_end` |

Basis for the crew board: local hypothesis (a lead should see who needs
attention and why without clicking), consistent with the W3C objective
"Help Users Find What They Need", which was not read in full.

## Still average

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
