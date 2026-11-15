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
make demo           # server + station window + crew app
```

No Rust? Use two terminals: `make server`, then `make station-web`, and open
<http://localhost:1420>. The crew app is at <http://localhost:8000/crew/>;
open it in a phone-sized browser window, or scan the QR code shown in
**Mission settings** with a phone on the same network.

The reaction update adds tables at startup and preserves existing records.
Do not reset after a normal pull. `make reset` is an explicit destructive
demo preparation step: it replaces the database with fictional data,
including simulated reaction sessions; use a disposable database or back
up your demo records first. It is not required to install this feature.

Try the product: pick a crew member in the crew app, do a
check-in with the reaction test, then look at the **Crew** and **Alerts**
screens of the station. The buttons under **Mission settings → Demo
controls** replay each step of the demo.

## 4. Make a change

| Step | Command or place |
|---|---|
| Start from the latest work | `git switch main`, then `git pull --ff-only`; the consolidation through `5ff5ef3` is merged |
| One task, one branch | `git switch -c fix/short-name` |
| Find where the code goes | "Where things go" in `.agents/skills/hestia-development/SKILL.md`, and [architecture.md](architecture.md) |
| A number to change | `server/data/`: sourced value, colour band or demo rule — three different files, see [architecture.md](architecture.md) |
| Try something risky | Set `HESTIA_DB_PATH` to a temporary file so that `server/hestia.db` is untouched |

## 5. Check before you commit

```bash
pnpm lint                               # both apps + shared packages; warnings still open
pnpm format:check                       # Prettier on frontend sources
make test                               # backend tests
pnpm --filter crew test                 # reaction timing, sync, check-in flow, newest reading (Node 22.6+)
pnpm --filter station test              # crew data freshness and readings (Node 22.6+)
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

- [x] David confirmed that a real phone opens the crew app over local Wi-Fi on
      15 Nov (`10.184.21.92:8011/crew/`).
- [ ] Full phone save/meal/photo journey and the intended network with Internet
      disconnected. Opening the app alone does not verify these.
- [ ] The reaction test with a real finger: the timings look plausible and
      a tap before the signal is a false start and repeats the trial. Verify
      1 practice + 5 measured trials, background interruption, and a pending
      result that syncs once after reconnecting. See [reaction-protocol.md](reaction-protocol.md).
- [ ] The webcam scan of the real shelf, in both modes; note the accuracy.
- [ ] The grid calibration on the real shelf.
- [ ] `make demo` with the Tauri window, and one full run of
      [demo-script.md](demo-script.md) without internet, timed (retain local Wi-Fi when using a separate phone).
- [ ] The same run on a second machine, as a spare.

## If something does not start

| Symptom | Cause and fix |
|---|---|
| A database error after a pull | Keep the database; read the error and migration notes before resetting. New reaction tables are created additively at startup |
| A scan answers 503 | Ollama is not running or the model is missing: `ollama serve`, `ollama pull qwen2.5vl:7b`. Replay scans need neither |
| The phone cannot reach the station | Firewall prompt not accepted on the Mac, or the network isolates its clients: see [risks.md](risks.md) |
| `make test` says `uv: command not found` | Install uv, or run `server/.venv/bin/python -m pytest -q` from `server/` if the environment already exists |
| `pnpm` warns about the Node version | The repository asks for Node 22; Node 20 built both apps on 14 Nov, but use 22 |

Formatting: `pnpm format` applies Prettier to frontend sources. Python formatting/linting and CI are not configured. For a disposable station API preview: `VITE_API_BASE=http://127.0.0.1:8011 pnpm dev:station --port 1421`. Production defaults to localhost:8000.

## 15 Nov camera rehearsal and current preview

From station Pantry: New photo → Mac camera (or import) → frame → Assign products
to slots → back to photo → analyse → compare/correct → acknowledge → save.
A 1×3 photo uses A1/A2/A3; 2×2 uses A1/A2/B1/B2. Recheck assignments when changing
dimensions. Other slots retain their old inventory by default. When the photo
contains the whole new reserve, select that option before confirming the counts;
unseen slots then become zero. Do not choose it for a partial update.
Settings → Presentation tools → Prepare my products shows unused/multi-slot
assignments and adds products with package nutrition. “Start with empty stock”
requires confirmation and keeps the catalogue, assignments and health records.
One type per slot, several identical packages allowed. Use label nutrition for
real quantities; ×212 and the existing catalogue remain demo assumptions.

Updated 15 Nov afternoon: API 8011 now listens on `0.0.0.0`, retaining the same
temporary database. David confirmed phone access at `http://10.184.21.92:8011/crew/`.
Use the current QR on station preview `http://127.0.0.1:1422/`; the LAN address can
change. Full save/photo and camera-permission checks remain to do.
Browser camera needs localhost or HTTPS; a QR alone cannot solve school Wi-Fi
client isolation. Importing/transferring a photo is the fallback. Do not reset the
real database or kill unrelated ports to set up the rehearsal.

Record actual counts and elapsed time on several new photos, including empty
slots, one removal, changed lighting and an unrelated picture. A passed fake-camera
browser test does not validate physical hardware or vision accuracy. See the
[latest review](sources/2026-11-15-camera-review-and-pantry.md).

### Rehearsal to hand to Massi

David proposed Massi taking the full Earth-link rehearsal; no message has been
sent or ownership confirmed externally. Backend tests already cover red alert →
queued report → 1200 s advance → delivered → 1200 s advance → simulated reply.
A human still needs to rehearse the actual screen, inspect what was sent, and
explain the delay/accelerator. This is a local scripted exchange, not contact with
NASA or a remote medical team. Do this on a disposable/demo database.

At 390px the shared product sheet fits, but the station navigation/header is
still a desktop shell and overflows. Use the crew app for the phone demonstration;
a responsive station-shell pass is still open.

### Product values and demo scale (D42)

Settings → Presentation tools → Prepare my products → Products & values → Edit.
The centred form changes the existing product, keeps counts, and recalculates
nutrition for meals already linked to it. This prototype has no immutable nutrition
snapshot per historical meal. Enter values for a whole package, not per 100g.

Adjust multiplier in the same settings section: ×1 uses the catalogue's package
values, ×212 simulates mission lots, or choose a custom integer. Save explicitly.
This also changes the available demo meal portions; it does not rewrite counts or
consumption-event quantities. A full demo reset returns to the seeded default.
The recorded-package energy excludes scaling and meals after the last photo.

Below 768px the station displays an orientation screen to the crew app, replacing
the previously documented overflow. The link uses the configured API address;
a separate phone still requires a reachable local server. It is not an access-control
mechanism, nor a complete tablet/responsive station redesign.
