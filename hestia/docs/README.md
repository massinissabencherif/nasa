# HESTIA documentation — index

New here? Start with [development.md](development.md): from a fresh clone
to a first verified change.

Read in this order when you arrive:

1. [`AGENTS.md`](../../AGENTS.md) — rules shared by everyone, people and agents.
2. [STATUS.md](STATUS.md) — what works today, what is open, what is in progress.
3. [decisions.md](decisions.md) — what was decided and what is still open.
4. Then only what your task needs, from the table below.

Latest handover: [David and Massi's morning restart](reprise-2026-11-15-fr.md)
and [optional Fable context restart](prompt/2026-11-15-fable-final-readiness-fr.md).
The finishing list is open for either contributor; no task is assigned to Fable.

Implementation evidence: [camera, pantry, settings and checklist review](sources/2026-11-15-camera-review-and-pantry.md).

Current implementation and open requests: [15 Nov register](sources/2026-11-15-interactions-and-evidence.md), [screens and checks](design/2026-11-15/README.md).

Midday UI pass: [compact reaction results and zone explanations](design/2026-11-15/result-zone-clarity.md)
on `fix/reaction-zone-clarity`; current scope and limits are at the top of [STATUS](STATUS.md).

Afternoon UI pass: [mission explanations, compact settings and check-in](design/2026-11-15/mission-checkin-clarity.md). Phone opening over LAN is confirmed; full hardware rehearsal remains open.

Before-jury flow review: [ready-to-send Claude checklist](prompt/2026-11-15-claude-parcours-avant-jury-fr.md). Prepared, not sent; coordinate with Massi's Simulator/Earth work.

## Reference

| Document | What it answers |
|---|---|
| [product.md](product.md) | What HESTIA promises, what is in scope, how each need of the challenge is covered |
| [reaction-protocol.md](reaction-protocol.md) | Reaction protocol, persistence, comparison rules and verification limits |
| [architecture.md](architecture.md) | How the code is organised, technical choices, known debts |
| [ai-workflow.md](ai-workflow.md) | How Claude Code and Codex share rules, skills and tools; what was tested |
| [development.md](development.md) | Getting started as a contributor: install, run, change, check, and the hardware checklist |
| [../README.md](../README.md) | What the product does and every way to run it |
| [risks.md](risks.md) | What can fail during the demo and the fallback for each case |
| [vision-benchmark.md](vision-benchmark.md) | Measured accuracy and latency of the shelf reading |
| [licenses.md](licenses.md) | Licences of dependencies and assets |

## Sources

| Document | What it is |
|---|---|
| [sources/2026-11-14-counter-review-claude.md](sources/2026-11-14-counter-review-claude.md) | Independent review of version `39ddd85`: five reproduced defects, science check with sources, demo scenario (in French) |
| [sources/2026-11-14-ui-ux-review.md](sources/2026-11-14-ui-ux-review.md) | UI and UX review of the real screens: each change with its reason, its trade-off and how it was checked |
| [sources/2026-11-14-design-system-audit.md](sources/2026-11-14-design-system-audit.md) | Follow-up review: shared components, measured text contrasts, icons and copy discrepancies; no UI fixes in this pass |
| [nasa-resources.md](nasa-resources.md) | The official resources of the challenge and where each reference value comes from |

## Deliverables

| Document | State |
|---|---|
| [Fable UI handoff](prompt/2026-11-14-fable-ui-handoff-fr.md) and [portable mockup gallery](design/2026-11-14/README.md) | Prepared with David's approval on 14 Nov; visual direction D16, documentation delivery D17; UI implementation still pending |
| [nasa-project-page.md](nasa-project-page.md) | Stale draft: reconcile with D37–D44 and verify submission requirements before publishing; Fable's next task |
| [demo-script.md](demo-script.md) | Five-minute local-jury draft; old protocol/stock figures need reconciliation and hardware rehearsal |
| [slides-outline.md](slides-outline.md), [video-script.md](video-script.md), [video-subtitles.srt](video-subtitles.srt) | Drafts from 11 Nov |

## History

[prompt/](prompt/README.md) holds the briefs that started the project. They
are kept as a record and give no orders.
