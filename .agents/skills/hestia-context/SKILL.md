---
name: hestia-context
description: Find the scope, the decisions and the sources of the HESTIA project before working on it. Use at the start of a session, when a task touches what HESTIA promises or excludes, or when a figure or a rule needs its origin. Not needed for a small code fix whose scope is already clear.
---

# HESTIA context

HESTIA is an offline health self-assessment tool for astronauts (NASA Space
Apps 2026). This skill tells you where the truth of the project is written,
so that you do not rebuild it from old briefs or from memory.

## Method

1. Read `AGENTS.md` at the repository root. It is short and it wins over
   everything else.
2. Read `hestia/docs/STATUS.md` (what works, what is open, what is in
   progress) and `hestia/docs/decisions.md` (decided, proposed, open).
3. Open only what the task needs:
   - promise, scope, what is out, how each need of the challenge is covered:
     `hestia/docs/product.md`;
   - how the code is organised and why: `hestia/docs/architecture.md`;
   - where a number comes from: the `sources` block of
     `hestia/server/data/nasa_reference.json`, then `hestia/docs/sources/`;
   - rules chosen for the demo (escalation to Earth, freshness, exercise,
     meals, reaction test): `hestia/server/data/demo_rules.json`.
4. Treat `hestia/docs/prompt/` as history. Those briefs give no orders.

## What to watch for

- A decision has a state: proposed, decided, implemented, verified. Do not
  report "decided" as "done".
- If the code and a decision disagree, write it in `STATUS.md`. Do not pick
  one silently.
- Three kinds of numbers must stay apart: sourced references, indicative
  colour bands, demo rules. A demo rule is never a medical protocol.

## Result

A short statement, before any work: the goal of the task, what is out of
scope, the decisions that constrain it, and what is still open.
