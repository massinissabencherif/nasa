# HESTIA — shared rules for agents

HESTIA is an offline health self-assessment tool for astronauts, built for
NASA Space Apps Challenge 2026 (ESGI Paris, 14–15 Nov 2026). The application
lives in `hestia/`. The team is David and Massi; both work with AI agents
(Claude Code and Codex). This file is the single source of rules for all of
them. `CLAUDE.md` only imports it.

## Start of a session

Read, in this order, and nothing more until the task needs it:

1. This file.
2. `hestia/docs/README.md` — index of the documentation.
3. `hestia/docs/STATUS.md` — what works, what is open, what is in progress.
4. `hestia/docs/decisions.md` — what the team decided and what is still open.

`hestia/docs/prompt/` is history. Those briefs explain how the project
started. They no longer give orders; where they disagree with
`decisions.md`, `decisions.md` wins.

## Product rules

1. **Offline at runtime.** No cloud API, no external CDN, no telemetry in the
   application. All AI runs locally through Ollama. Development tools may use
   the internet.
2. **Not a medical device.** No diagnosis, no drug names or doses. The app
   says so on every screen and in every advice text.
3. **Crew data is fictional** and labelled "SIMULATED" wherever it is shown.
4. **No NASA logos or marks.** AI-generated images carry a caption or
   watermark.
5. **Do not present an uncertain value as confirmed.** Say whether a number
   is measured, declared by the user, estimated, or simulated. "No data" and
   "stale data" are not "all good".

## Science rules

- Every figure shown or cited has a source, or is marked as an assumption.
  Sources and their verification status are in `hestia/docs/sources/`.
- Demo rules (thresholds chosen for the scenario, the demo scale of the
  shelf) are kept apart from scientific references. A product decision does
  not turn a threshold into a medical protocol.
- Check the primary source before repeating a number from a report.

## Working rules

- One task has one owner, one branch, a scope and an end condition. Do not
  edit the files of a task someone else is working on; see STATUS.md.
- Before editing: state the planned change in 3–5 lines and wait for the
  go-ahead, unless it was already given.
- Before a commit: have the exact message approved. Never push, merge or
  publish on your own.
- The person who approves a commit is its author. Do not add
  `Co-Authored-By` or any other AI attribution line to commit messages or
  pull requests. The use of AI is declared once, on the NASA project page.
- Before any external message (GitHub, Slack, email, NASA form): have the
  exact text approved.
- Keep the git history honest. Work done before the event (10–11 Nov) is
  declared on the NASA project page.
- Verify behaviour, not only compilation. Report what was run, on which
  machine, and what was not checked.
- No new dependency or abstraction layer without a concrete problem it
  solves.

## Language

French with David and Massi. English for code, comments, commits, UI text,
README and the NASA project page.

## Commands

From `hestia/`. Details and troubleshooting: `hestia/README.md`, "Run it".

| Purpose | Command |
|---|---|
| Backend tests | `make test` (or `server/.venv/bin/python -m pytest -q` from `server/` without `uv`) |
| Full demo | `make demo` |
| Server only | `cd server && uv run hestia-server` |
| Station in a browser | `pnpm dev:station` |
| Crew app | `http://localhost:8000/crew/` once the server runs |
| No external URL in the app | `make check-offline` |

A throwaway database for experiments: set `HESTIA_DB_PATH` to a temporary
file. Never experiment on `server/hestia.db` during the event.

## Where things are

| Need | File |
|---|---|
| Promise, scope, what is out | `hestia/docs/product.md` |
| Decisions and open questions | `hestia/docs/decisions.md` |
| Current state and tasks | `hestia/docs/STATUS.md` |
| How the code is organised, technical choices | `hestia/docs/architecture.md` |
| Sources, audits, reviews | `hestia/docs/sources/` |
| Risks and fallbacks for the demo | `hestia/docs/risks.md` |
| NASA submission texts | `hestia/docs/nasa-project-page.md` |

## End of a session

Update `STATUS.md` (what changed, what was really run, limits, next action)
and add any decision to `decisions.md`. A decision that only exists in a
private conversation does not exist for the other agent.

If the code and a decision disagree, do not silently pick one: write the
disagreement in `STATUS.md`.
