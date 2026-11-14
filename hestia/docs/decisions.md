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

## Open

| # | Question | Proposal | Who decides |
|---|---|---|---|
| O1 | What does the "exercise minutes" field of a check-in mean when there are several check-ins in a day? | Minutes for the day so far: the latest check-in of a day replaces the earlier ones | David and Massi |
| O2 | Which results justify a report to Earth? Today every red does, including a systolic pressure of 140 | A separate "critical" band per indicator, stored as a demo rule, apart from the scientific references | David and Massi |
| O3 | Which machine runs the demo, and which is the spare? | Massi's Mac runs it today. David's Mac lacks `uv`, `ollama` and `cargo`; installing them would give a spare | David and Massi |
| O4 | NASA submission: 30-second video or 7 slides? | — | David and Massi |
| O5 | Figures without a source: 12,000 kJ/day, ISS 0.523 mSv/day | Source them or remove them from the app and the project page | Whoever takes the science task |

## Rules for this file

- Add a line when a decision is made; change its state when the code
  catches up and again when someone has checked it.
- If the code and a decision disagree, say so in [STATUS.md](STATUS.md).
- Never rewrite an old line to hide a change of mind: add a new one that
  replaces it and say which.
