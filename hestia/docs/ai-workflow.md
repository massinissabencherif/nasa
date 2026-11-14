# Working with AI agents on HESTIA

Two people (David, Massi) and two kinds of agents (Claude Code, Codex) work
on this repository. This page says how they share rules, skills and tools,
and what was really tested. Rules themselves are in
[`AGENTS.md`](../../AGENTS.md); this page does not repeat them.

## One source for rules and skills

| What | Where | How each agent finds it |
|---|---|---|
| Rules | `AGENTS.md` at the repository root | Codex reads `AGENTS.md`. Claude Code reads `CLAUDE.md`, which contains only `@AGENTS.md` |
| Skills | `.agents/skills/<name>/SKILL.md` | Claude Code: through the `.claude/skills` symlink. Codex: reads `.agents/skills` directly |
| Decisions, state | `hestia/docs/decisions.md`, `hestia/docs/STATUS.md` | Both read them at the start of a session |

Never create a second copy of a rule or a skill for one agent. If an agent
needs another folder name, add a link to `.agents/skills`, not a copy.

## The five skills

| Skill | Use it when |
|---|---|
| `hestia-context` | starting a session, or when scope, a decision or the origin of a number matters |
| `hestia-development` | changing code in `hestia/` |
| `hestia-verification` | before saying a task is done, before a commit, before a rehearsal |
| `hestia-ui-polish` | a screen looks cheap or machine-made |
| `hestia-ux-research` | a screen is hard to understand and the fix needs a reason |

## Tools

The application runs offline. Development tools may use the internet.

| Need | Claude Code | Codex | Fallback |
|---|---|---|---|
| Read official documentation of a library | Context7 plugin if installed; otherwise web search | Its own web tool | Read the docs in a browser and paste the relevant part |
| Look at a real screen, take screenshots | A browser tool if one is installed | The bundled browser plugin | Headless Chrome over the DevTools protocol, driven by a short script (used on 14 Nov, see `hestia-verification`) |
| Git and local tests | Built in | Built in | — |

Do not assume a Claude plugin works in Codex or the reverse: inspect an
extension before installing it. Never copy credentials, a personal global
configuration or a work integration into this repository.

## Coordination

- A task has an owner, a branch, a scope and an end condition. Write the
  task in progress in `STATUS.md` before starting, so the other agent does
  not edit the same files.
- Branches of 14 Nov, stacked in this order: `chore/agents-docs` →
  `fix/health-rules` → `feat/reaction-test` → `chore/shared-skills` →
  `style/memorable-screens`. All were merged into `main` and pushed on
  14 Nov through `5ff5ef3`, after David and Massi's approval. New work branches
  from `main`; see `STATUS.md` for the active task.
- A shared change is reviewed by the other person, or by the other agent on
  their behalf, before it is merged. The human approves the commit message
  and is the author.
- A decision taken in a private conversation must be written in
  `decisions.md` in the same session.

## Starting and ending a session

Start: `AGENTS.md`, then `docs/README.md`, `STATUS.md`, `decisions.md`, then
only what the task needs.

End: update `STATUS.md` (what changed, what was really run and where, what
was not checked, the next action) and `decisions.md`.

## What was tested, and what was not

| Check | Machine | Result |
|---|---|---|
| Claude Code 2.1.236 reads `CLAUDE.md` → `AGENTS.md` and works in the repository | David's Mac | Used for all the work of 14 Nov |
| `.claude/skills` resolves to the five skill folders | David's Mac | Yes (`ls .claude/skills`) |
| Links between documents | David's Mac | Checked by script on 14 Nov |
| A fresh Claude Code session (`claude -p`, no history) finds the goal, the excluded scope, the test command, the branch in progress, the decisions awaiting confirmation and the source of a reference value | David's Mac, 14 Nov | Pass on all seven questions; the five skills appeared as skills, not only as files |
| A fresh Codex 0.159.2 session (`codex exec --sandbox read-only`), same questions | David's Mac, 14 Nov | Pass on all seven questions; the five skills were exposed as skills from `.agents/skills` |
| Anything on Massi's machine | — | **Not tested.** The symlink needs a checkout that keeps symlinks (default on macOS and Linux) |
