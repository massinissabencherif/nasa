# Getting started as a contributor

For a person (or an agent) who has never worked on HESTIA. Twenty minutes
from a fresh clone to a first verified change. Rules are in
[`AGENTS.md`](../../AGENTS.md); this page is the practical path.

## 1. Read three things (5 minutes)

1. [product.md](product.md): what HESTIA promises and what is out.
2. [STATUS.md](STATUS.md): what works today and what is open.
3. [decisions.md](decisions.md): what was decided, and what waits for you
   to confirm.

## 2. Install (once, online)

You need Node 22+, pnpm 10+, Python 3.12 and
[uv](https://docs.astral.sh/uv/). For the shelf camera you also need
[Ollama](https://ollama.com) with the `qwen2.5vl:7b` model (about 6 GB). For
the desktop window you need Rust; without it the station runs in a browser.

```bash
cd hestia
make install        # JavaScript and Python dependencies
```

## 3. Run it

```bash
make reset          # fresh database with the seeded crew; do it after every pull
make demo           # server + station window + crew app
```

No Rust? Use two terminals: `make server`, then `make station-web`, and open
<http://localhost:1420>. The crew app is at <http://localhost:8000/crew/>;
open it in a phone-sized browser window, or scan the QR code shown in
**Mission settings** with a phone on the same network.

Try the product in two minutes: pick a crew member in the crew app, do a
check-in with the reaction test, then look at the **Crew** and **Alerts**
screens of the station. The buttons under **Mission settings → Demo
controls** replay each step of the demo.

## 4. Make a change

| Step | Command or place |
|---|---|
| Start from the latest work | `git switch style/memorable-screens` until it is merged into `main`, then branch from `main` |
| One task, one branch | `git switch -c fix/short-name` |
| Find where the code goes | "Where things go" in `.agents/skills/hestia-development/SKILL.md`, and [architecture.md](architecture.md) |
| A number to change | `server/data/`: sourced value, colour band or demo rule — three different files, see [architecture.md](architecture.md) |
| Try something risky | Set `HESTIA_DB_PATH` to a temporary file so that `server/hestia.db` is untouched |

## 5. Check before you commit

```bash
make test                               # backend tests
pnpm --filter crew exec tsc -b          # types of the crew app
pnpm build:crew && pnpm build:station   # both apps build
make check-offline                      # no external URL in the application
```

Then look at the screen you changed, in a browser, with the seeded data.
Compiling is not working: see `.agents/skills/hestia-verification/SKILL.md`.

Commit messages are in English, in the style of the existing history
(`fix: …`, `feat: …`, `docs: …`), with no AI attribution line. Update
`STATUS.md` and, if you decided something, `decisions.md`.

## 6. Working with an AI agent

Open the repository root in Claude Code or Codex. Both read the same rules
(`AGENTS.md`) and the same five skills (`.agents/skills/`). Ask the agent to
start with the `hestia-context` skill. Details and what was tested:
[ai-workflow.md](ai-workflow.md).

## 7. What only someone with the hardware can check

None of this was verified on 14 Nov. Do it before the jury and write the
result in `STATUS.md`:

- [ ] A real phone reaches the station on the base network (phone hotspot
      with mobile data off), and the crew app works on it.
- [ ] The reaction test with a real finger: the timings look plausible and
      a tap before the signal is not counted.
- [ ] The webcam scan of the real shelf, in both modes; note the accuracy.
- [ ] The grid calibration on the real shelf.
- [ ] `make demo` with the Tauri window, and one full run of
      [demo-script.md](demo-script.md) with Wi-Fi off, timed.
- [ ] The same run on a second machine, as a spare.

## If something does not start

| Symptom | Cause and fix |
|---|---|
| A database error after a pull | The seed or a table changed: `make reset` |
| A scan answers 503 | Ollama is not running or the model is missing: `ollama serve`, `ollama pull qwen2.5vl:7b`. Replay scans need neither |
| The phone cannot reach the station | Firewall prompt not accepted on the Mac, or the network isolates its clients: see [risks.md](risks.md) |
| `make test` says `uv: command not found` | Install uv, or run `server/.venv/bin/python -m pytest -q` from `server/` if the environment already exists |
| `pnpm` warns about the Node version | The repository asks for Node 22; Node 20 built both apps on 14 Nov, but use 22 |
