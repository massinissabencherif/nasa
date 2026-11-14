# HESTIA — decisions

One line per decision. A decision has four possible states: **proposed**,
**decided**, **implemented**, **verified**. Do not skip a state: "decided"
says nothing about the code.

## Decided

| # | Date | Decision | Decided by | State | Reason / source |
|---|---|---|---|---|---|
| D1 | 14 Nov 2026 | The team builds HESTIA, not Field Shift | David, Massi | decided | A working prototype against a research file with no code. [Counter-review](sources/2026-11-14-counter-review-claude.md), section 1 |
| D2 | 14 Nov 2026 | Work done on 10–11 Nov stays in the git history as it is and is declared on the NASA project page | David | decided | The local organisers allow preparatory work. David confirms this also covers international eligibility; the agents did not check it themselves |
| D3 | 14 Nov 2026 | Scope as written in [product.md](product.md): check-in, silhouette, alerts, Earth link and history are the core; the pantry is in the main demo; forecasts close the demo as the next step; calibration gets one sentence; gamification leaves the main path | David (Massi to confirm) | decided, not implemented | Five minutes of demo; fit with the challenge text |
| D4 | 14 Nov 2026 | No feature code is deleted without a line in this file | David | decided | "Not in the pitch" is not "to remove" |
| D5 | 14 Nov 2026 | `AGENTS.md` at the repository root is the only rule file for agents; `CLAUDE.md` imports it; `docs/prompt/` is history | David | implemented on branch `chore/agents-docs`, not merged | Two agents, two people, one set of rules |
| D6 | 14 Nov 2026 | The exercise minutes of a check-in are the total for that calendar day; the latest check-in of a day replaces the earlier ones; a streak counts days | Fable, under David's delegation — **David and Massi to confirm** | implemented, verified by tests | Seven check-ins in one day counted as seven days. Rule text: `server/data/demo_rules.json` |
| D7 | 14 Nov 2026 | A report goes to Earth when one red indicator is in its critical band, or when two or more indicators are red together. A single red reading outside the critical band stays with the crew. Critical bands: systolic ≥ 180 or < 80, diastolic ≥ 120 or < 50, heart rate > 130 or < 40, temperature ≥ 39.5 or < 35.0, glucose ≥ 250 or < 55, dose > 100 % of the limit | Fable, under David's delegation — **David and Massi to confirm the bands** | implemented, verified by tests | A systolic pressure of 140 alone queued a report. These are demo rules, not a medical protocol |
| D8 | 14 Nov 2026 | A meal removes real portions; a shelf scan adds or removes boxes, each box being a whole lot at the demo scale. **A box removed between two scans is no longer attributed to the person who logged a meal just before** | Fable, under David's delegation — **David and Massi to confirm, since a behaviour was removed** | implemented, verified by tests | One 212 kcal meal removed 44,944 kcal. Attributing a whole lot to one meal has no meaning at the demo scale |
| D9 | 14 Nov 2026 | A zone with no reading is "no data", and a zone whose newest reading is older than 72 h is "no recent data" with its last level kept aside. Neither is shown green. The cumulative radiation dose is exempt | Fable, under David's delegation | implemented, verified by tests | A profile with no measurement showed eight green zones |
| D10 | 14 Nov 2026 | Removed from the app and the data: the "12,000 kJ/day NASA reference" and the unused O₂, CO₂ and water-recycling figures. The radiation zone is labelled "Radiation exposure", not "Skin". The lunar dose rate is attributed to Chang'e-4 | Fable, under David's delegation | implemented | No source found, or wrong attribution. See `nasa_reference.json`, "sources" |
| D11 | 14 Nov 2026 | A reaction self-test is added to the check-in: five signals, measured by the phone, compared with the astronaut's own baseline, capped at an orange advice | David chose the idea; rule details by Fable under delegation | implemented, verified by tests and by a replay in a headless browser | "Measured, not typed". Inspired by NASA's Reaction Self-Test on the ISS; this short version is a screening aid, not a validated test |
| D12 | 14 Nov 2026 | The station opens on Crew and its navigation is health first; streak and badges are collapsed on the phone; the forecast screen is named "What-if simulator" | Fable, applying D3 | implemented | The challenge is about health self-assessment |
| D13 | 14 Nov 2026 | Five shared skills live in `.agents/skills/`; `.claude/skills` is a symlink to it | Fable, applying the consolidation brief | implemented; discovery by Codex not verified | One source for both agents. See [ai-workflow.md](ai-workflow.md) |

## Proposed, not decided

| # | Idea | State |
|---|---|---|
| P1 | Compare every vital sign with the astronaut's own 30-day baseline, in addition to the fixed bands ("your heart rate has been rising for five days") | Proposed by Fable. David: interesting if it is quick and useful, otherwise not. Done only for the reaction test so far |
| P2 | Heart rate measured by the camera from the face (remote photoplethysmography) | Proposed by Fable. David: maybe, possibly for Massi. Not started. Sensitive to lighting; the typed value must remain as a fallback |
| P3 | Other self-tests run by the phone (for example a near-vision check for the eyes zone) | Raised by David. Not started. Any such test needs a source and a "screening only" label |

## Open

| # | Question | Proposal | Who decides |
|---|---|---|---|
| O3 | Which machine runs the demo, and which is the spare? | Massi's Mac runs it today. David's Mac lacks `uv`, `ollama` and `cargo`; installing them would give a spare | David and Massi |
| O4 | NASA submission: 30-second video or 7 slides? | — | David and Massi |
| O5 | ISS dose rate 0.523 mSv/day has no source; it is now flagged as an assumption in the app | Source it (the CSA radiation resource of the challenge is a lead) or keep it as an assumption | Whoever takes the science task |
| O6 | The sources in `nasa_reference.json` were checked from press releases and abstracts, not from the full papers | Read the primary sources before quoting a figure to the jury | Whoever takes the science task |

## Rules for this file

- Add a line when a decision is made; change its state when the code
  catches up and again when someone has checked it.
- If the code and a decision disagree, say so in [STATUS.md](STATUS.md).
- Never rewrite an old line to hide a change of mind: add a new one that
  replaces it and say which.
