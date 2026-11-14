---
name: hestia-development
description: Change HESTIA code within its boundaries and conventions - FastAPI engines and routes, React screens, shared UI and API client. Use for any code change in hestia/. Pair it with hestia-verification before reporting the work as done.
---

# HESTIA development

## Before editing

Read `AGENTS.md` (working rules, commands) and the "Boundaries" section of
`hestia/docs/architecture.md`. State the planned change in 3–5 lines and
wait for the go-ahead unless it was already given. Work on a branch; one
task, one owner.

## Where things go

| Kind of change | Place |
|---|---|
| A rule or a calculation | `hestia/server/app/engines/`. Keep it testable without HTTP; `forecast.py` is pure, keep it so |
| An HTTP endpoint | `hestia/server/app/routes/`: read the request, call an engine, shape the answer. No calculation here |
| A number that may change | `hestia/server/data/`: sourced value → `nasa_reference.json`; colour band → `thresholds.json`; team choice → `demo_rules.json` |
| A type shared by both apps | `hestia/packages/api-client/src/index.ts`, once. Do not redefine it in a screen |
| A component or a style used twice | `hestia/packages/ui/` (tokens in `styles/tokens.css`) |
| Logic of a screen | a plain `.ts` file next to it (see `apps/crew/src/lib/reactionTest.ts`), not inside the component |

## Conventions

- Every check-in goes through `engines/checkin.py::record_checkin`.
- A missing value is `None` / "unknown", never a default that looks healthy.
- Say whether a value is measured, declared, estimated or simulated.
- Screens distinguish loading, no data, error and stale data.
- A React effect only for a real side effect (a timer to clear, a
  subscription). Derive the rest during render.
- Styles use the shared tokens (`var(--…)`). No new colour or spacing value
  in a screen.
- No new dependency or abstraction without a concrete problem.
- The application stays offline: no external URL (`make check-offline`).
- English for code, comments, UI text and commits.

## Tests

A fix comes with a test that fails without it. A test that pins a wrong
behaviour may change: say which and why in the commit message. The demo
numbers pinned by `server/tests/test_demo_e2e.py` (412 → 398 days) must not
move by accident.

## Result

A small, reviewable change on a branch, with its tests, and a proposed
commit message for approval. No `Co-Authored-By` line.
