# HESTIA — status

Last update: 14 Nov 2026 (first day of the event). This file says what
works, how it was checked, and what is still open. Decisions are in
[decisions.md](decisions.md).

## 14 Nov — UI direction and handoff for Fable

David approved a documentation-only handoff: [brief](prompt/2026-11-14-fable-ui-handoff-fr.md),
[design-system audit](sources/2026-11-14-design-system-audit.md) and
[portable image gallery](design/2026-11-14/README.md). Astra prepared these
on the existing `feat/reaction-protocol` working tree, without changing
application code, installing a plugin, committing or publishing.

**Chosen direction (D16):** Space Grotesk for the interface, Plex Mono for
short numeric readings, original navy/vivid cyan, large body with eight
visible zones. David rejected the softened graphite/cyan variant and the
layout that reduced the body. He wants Fable to add restrained character,
measurement icons and visual depth. Individual layouts remain proposals.

**Lot 1, foundations, done later on 14 Nov by Fable (D18), not committed.**
Space Grotesk bundled locally and loaded (checked in Chrome: weights 400–700
loaded, `aria-current` on the active page, `nav` labelled). Contrast-safe text
roles and status inks, shared button states, seven measure icons next to the
check-in fields, two wrong texts corrected, `hestia-ui-polish` synchronised.
Files: `packages/ui/src/{styles/tokens.css,styles/fonts.css,fonts/*,icons.tsx,
components/{Button,TabBar,NavRail,Panel,StatusBadge,SilhouetteBody}.tsx}`,
`apps/crew/src/components/FieldRow.tsx`, `apps/crew/src/screens/Meal.tsx`,
`apps/station/src/screens/{AlertsScreen,EarthScreen}.tsx`,
`docs/licenses.md`, `.agents/skills/hestia-ui-polish/SKILL.md`.
Checks run: both apps type-check and build, `make check-offline` passes, 69
backend tests pass, icons rendered at 16/20/24/48 px.

**Still not implemented:** the proposed layouts, the step-by-step check-in,
visual depth between surfaces, the remaining lots 2 to 4 of the brief.
Small texts written with `var(--red)` or `var(--green)` outside the shared
components (for example the red values on the station crew board and the
reaction card) still need the ink colours: they belong to the screens of
lots 2 and 3, which also contain Astra's uncommitted changes.
The blood-pressure cuff is the weakest icon at 16 px and the glucose meter
reads as a generic device: to review with David. Nobody has looked at the
new font on a physical phone.
The existing reaction protocol remains 3 practice + 15 measured trials.

**Evidence and limits:** real-font mockups rendered in Chrome at 390×844,
width checked at 360×780; station at 1280×800. No horizontal overflow in
those prototype checks. Some phone pages intentionally scroll vertically.
Buttons are not connected to the app. No physical-device or user study was
performed. Code review found low text contrast and inaccurate copy about
Earth escalation and meal/box attribution; see the audit. Earlier backend
and frontend tests below were not rerun for this documentation-only pass.

**Handoff checks:** 126 local links resolve; all 15 image dimensions and
SHA-256 hashes match the manifest. The portable gallery loads its 12
individual views in Chrome with no external request, script error or
horizontal overflow at 390 and 1280 px. The 275 tracked/untracked non-doc
files have identical hashes to the start of this handoff; the existing
reaction implementation is untouched. `git diff --check` passes.

**Next:** David/Fable select and authorise the next code lot under AGENTS.md;
first preserve the uncommitted reaction work described below. Confirm task
ownership with Massi. The handoff is local until explicitly shared: no
commit, push, merge or external message has been authorised for this pass.

## 14 Nov — consolidation

The five stacked branches were merged into `main` by fast-forward and pushed
on 14 Nov, after David and Massi approved it. `main` reached `5ff5ef3` with
all 11 commits preserved. Astra reran the 60 backend tests and both web
builds successfully on David's Mac (Python 3.13, Node 25.7.0).

### Current task — Astra, `feat/reaction-protocol`

Approved first lot: archive the [health-assessments brief](prompt/2026-11-14-health-assessments-fr.md),
update merge documentation and evolve the existing reaction test. Scope:
3 practice trials, 15 measured trials, interruption handling, versioned
sessions, server statistics, per-device reference, pending sync and history.
No wellbeing or injury-journal implementation in this lot. No commit or push
authorised. End condition: API and browser checks, preserved existing data
and demo, and an honest verification record. **Implemented and verified in
software; awaiting David’s review and commit-message approval.** This branch
has not been committed, pushed or merged.

### Reaction lot — verified 14 Nov by Astra

- Existing test evolved to 3 practice + 15 measured trials. Raw attempts,
  timeout/false-start/interruption states, device/protocol/source separation,
  server recomputation and idempotent saving are implemented.
- Home → Health assessments, contextual brain link, preserved check-in form,
  shared crew/station history and offline pending-sync states are connected.
  Legacy five-trial measurements stay separate and labelled. New sessions
  cause no automatic colour, alert or Earth report.
- Additive tables preserve the database. A fresh/reset demo database includes
  simulated complete/interrupted sessions. Existing databases need no reset.
  Protocol and limits: [reaction-protocol.md](reaction-protocol.md).
- Brief archived; product/architecture/development/pitch/NASA-page draft
  updated. The pitch shows a previously saved result, rather than claiming
  to complete a 1–2 minute protocol in 20 seconds. Nothing was submitted.

| Check | Machine | Result |
|---|---|---|
| Backend suite, including existing demo and 9 new reaction tests | David’s Mac, Python 3.13 | **69 pass**; one existing Starlette/httpx deprecation warning |
| Runner and storage tests, `pnpm --filter crew test` | David’s Mac, Node 25.7.0 | **10 pass**; false starts, timeouts, duplicate events, interruption, reference exclusions covered across frontend/API tests |
| Type checks + production builds | David’s Mac, Node 25.7.0 / pnpm 10.30.3 | Both pass; existing bundle-size warning remains |
| Crew lint | David’s Mac | No new warning; 5 existing React warnings in ApiProvider, hooks, Home and Pantry remain |
| Complete reaction UI → real local API | Chrome headless, 390×844, throwaway SQLite | 3 practice + 15 measured; false start, timeout, keyboard/pointer inputs; 14 valid / 1 false start / 1 timeout saved once. Full session driven by Playwright’s clock, not human timing |
| Pending save | Same browser/API | Station API requests deliberately failed; interrupted result survived page reload; retry saved one record and cleared the pending copy |
| Check-in integration | Same browser | Blood pressure, mood and symptom selections preserved after leaving the test |
| Real-clock practice + lifecycle | Same browser, without clock replacement | Touch input produced a time; abandon and hidden-page interruption saved incomplete sessions |
| Station individual history | Chrome headless, 1280×800 | Raw attempts, source labels and reference from 5 simulated comparable sessions displayed; body status loaded |
| Layout/runtime | Both browser sizes | Screenshots inspected; no horizontal overflow, JavaScript page error or external runtime request in the tested path |
| Offline URL check / whitespace | David’s Mac | `make check-offline` and `git diff --check` pass |

Browser evidence is local to this machine in
`/private/tmp/hestia-reaction-review/` (scripts, results and PNGs); it is not
part of the repository. All browser/API experiments used a disposable
SQLite file; `server/hestia.db` was not reset or used for these checks.

**Not verified in this lot:** a physical phone, native Capacitor/Tauri,
actual Wi-Fi loss, timing accuracy, camera/vision/real shelf or a full
five-minute stage rehearsal. Existing demo behaviour passed through the
API with a mock shelf scan; that does not validate real hardware.

**Next owner/action:** David reviews the first lot, approves a commit
message if ready, then David/Massi run the hardware checklist. Do not start
P4/P5 without their scope decision; wellbeing still needs the mood/sleep
integration choice. No publication is authorised by this record.

| Branch | Content |
|---|---|
| `chore/agents-docs` | `AGENTS.md`, documentation index, `product.md`, `decisions.md`, old briefs marked as history |
| `fix/health-rules` | The five defects below, science wording and sources |
| `feat/reaction-test` | Reaction self-test; station navigation health first |
| `chore/shared-skills` | Five shared skills, advice hierarchy, this documentation, contributor guide |
| `style/memorable-screens` | Station crew board with readings; Earth link built around the signal path; time-skip order fixed |

### Defects of version `39ddd85`: fixed on branch `fix/health-rules`

Reproduced on 14 Nov through the HTTP API on a throwaway database, then
fixed and reproduced again with the same script. Details of the original
behaviour:
[sources/2026-11-14-counter-review-claude.md](sources/2026-11-14-counter-review-claude.md).
The rules chosen are decisions D6 to D10 in [decisions.md](decisions.md) and
are written in `server/data/demo_rules.json`.

| Defect | Now | Test |
|---|---|---|
| Seven check-ins on one day counted as seven days of low exercise | One day; the latest check-in of the day is the day's total | `test_several_checkins_on_one_day_are_one_day_of_exercise` |
| A crew member with no measurement showed eight green zones | Eight zones "no data"; a reading older than 72 h is "no recent data" | `test_a_crew_member_without_any_measurement_is_unknown_not_green`, `test_an_old_reading_is_stale_and_keeps_its_last_level` |
| One 212 kcal meal removed 44,944 kcal from the stock | A meal removes portions; only a scan removes boxes | `test_a_meal_removes_portions_and_a_scan_removes_boxes` |
| A systolic pressure of 140 alone queued a report for Earth | A report needs a critical value or two red indicators | `test_one_red_reading_outside_the_critical_band_stays_with_the_crew`, `test_a_second_red_indicator_escalates_and_the_report_lists_both` |
| Same advice for an orange and a red reading | The advice states the value, its direction and the level; red starts with "Tell the crew medical officer now" | `test_advice_depends_on_value_direction_and_level` |

Science and wording corrected in the same branch: the radiation zone is
"Radiation exposure"; the bones zone says it tracks exercise adherence, not
bone density; the eyes zone says SANS is detected by imaging; hazards use
the wording of the challenge; the lunar dose rate is attributed to
Chang'e-4; the Mars delay is 3–22 min; unsourced figures are removed or
flagged. Each reference value now has a source line in
`server/data/nasa_reference.json`.

Still open:

- The old meal-event seed changed during consolidation. Prepare fresh
  fictional data only on a disposable demo database; a reset erases records.
  The new reaction tables are additive and do not require a reset.
- Nothing was run on a physical phone, with the vision model, on a real
  shelf or in the Tauri window on 14 Nov by the agent. The checklist to
  tick is in [development.md](development.md), section 7.
- The reaction test was driven by a script, not by a finger: its timing on
  a real phone is unknown.
- The demo rules D6 to D8 and the critical bands of D7 wait for
  confirmation by David and Massi.
- A fresh Claude Code session and a fresh Codex session both found their
  way through the new documentation on David's Mac (see
  [ai-workflow.md](ai-workflow.md)). Nothing was tried on Massi's machine.

### What was run on 14 Nov, and where

| Check | Machine | Result |
|---|---|---|
| Backend tests | David's Mac (M1 Pro), with the bundled `.venv`, Python 3.13 | 60 pass on `chore/shared-skills` (53 on `39ddd85`) |
| Type check and production build of both web apps | David's Mac, Node 20 (the repository asks for 22) | Pass |
| Demo steps replayed in headless Chrome: reaction test, check-in, orange advice, red alert, alerts screen, crew screen | David's Mac | Pass, screenshots looked at. The camera scan was not part of it |
| Native iOS build on an iPhone | Massi's Mac | Works, as reported by Massi below; not seen by anyone else |
| Vision scan, Tauri window, real shelf, hotspot without internet | — | Not run on 14 Nov. David's Mac has no `uv`, `ollama` or `cargo` |

The sections below were written on 11 Nov, before the event, except where a
date says otherwise.

## What works, and how it was verified

| Area | State | Verified by |
|---|---|---|
| Backend engines (nutrition, thresholds/status, alerts, advice, forecast, gamification) | done | `make test`: 53 tests pass |
| Demo script end to end through the HTTP API (check-in → orange, 412 → 398, delayed cargo → ration, red alert → Earth report → reply) | done | `server/tests/test_demo_e2e.py` |
| Station UI: Crew, Pantry, Calibration, Forecasts, Alerts, Earth link, Mission settings | done | driven in headless Chrome at 1280×800/1000, screenshots reviewed |
| Crew app: profile, home, check-in, meal, history, settings | done | driven in headless Chrome at 390×844 from `http://localhost:8000/crew/` |
| Live updates (SSE on the station) | done | SSE stream captured during a real scan: 12 per-slot progress events, then completion |
| Vision scan through the real model | done | scan of both test images through `POST /api/pantry/scan`; numbers in `docs/vision-benchmark.md` |
| Tauri desktop window | compiles and starts | `cargo build` + `tauri dev` launched the process; the window content itself was not inspected (it loads the same page verified in Chrome) |
| Offline rule | no non-local URL in the source | `make check-offline` |

## Review pass of 11 Nov — what was wrong and is now fixed

- **SSE events were published from worker threads straight into asyncio
  queues**, so they only arrived when the event loop happened to wake up.
  Now handed over with `call_soon_threadsafe`.
- **The demo could not be replayed on stage**: both anomalies were baked into
  the seed, so the Earth message was already "delivered" minutes after
  seeding, and the seeded "today" row could be in the future before 09:00
  Paris time, hiding a real check-in. The seed now ends yesterday and starts
  all green; anomalies are triggered live or by scenario buttons.
- **A relapse never alerted again** (dedupe compared with the last alert
  forever). Alerts now have a `resolved` flag.
- **Two red indicators produced two Earth reports.** Now one report per
  check-in listing every red finding.
- **Live camera scans were not saved**, so the overlay was drawn on the test
  photo. Frames are now stored in `server/captures/` and served.
- **Low-confidence readings had no confirmation UI**, and confirming did not
  correct the consumption feed. Both done.
- **Vision timing in the docs was measured on a cached image.** Re-measured;
  the pipeline was rebuilt around one schema-constrained call (see
  `docs/vision-benchmark.md`).
- The station top bar did not follow a context change; the symptom "fatigue"
  coloured the eyes zone; zone panels showed "—" for derived indicators; the
  QR code and LAN address required by the addendum were missing; the crew app
  defaulted to `localhost` on a phone; no "SIMULATED / not a medical device"
  banner on mobile; the Tauri entry point did not compile
  (`hestia-station_lib`); scans of arbitrary file paths were accepted from the
  LAN; context switches dropped the demo clock and LLM settings.

## Added 11 Nov: any camera, real inventory

- `POST /api/pantry/photo`: a phone (crew app → Pantry tab) or a
  file picker on the station uploads a photo; it is scanned like a webcam
  frame, or only stored as the reference picture for calibration.
- Calibration screen: outer frame → 3 × 4 slots, per-slot item and capacity,
  add products of the real shelf. Scans now use the slot assignments from the
  database, and crop the photo to the calibrated shelf when it fills less
  than 60 % of the frame.
- Checked with a simulated phone photo (test shelf pasted into a larger
  frame) through the real model: accurate mode 10/12 in 47 s, fast mode 7/12
  in 28 s. **Not checked with a real phone or a real shelf.** The phone page
  was only rendered, its camera button was not exercised on a device.

## Added 11 Nov: Pantry tab in the crew app

- Live inventory on the phone (picture with per-slot counts, autonomy and
  its change, movements, tap-to-correct), polling every 2.5 s plus the event
  stream for per-slot progress.
- Photo capture from the tab; in-app viewfinder and "Live mode" (continuous
  re-reading) where the page is a secure context: the installed Capacitor app
  or `localhost`. The Android manifest now asks for the CAMERA permission.
- Checked in headless Chrome at 390 px: the tab updated by itself after a
  scan made elsewhere (412 → 398, −14.0 d), and the viewfinder + capture path
  ran with Chrome's fake camera through to the station. **Not checked on a
  real phone, and not in the installed app** (no APK yet), so the in-app
  viewfinder and its permission prompt are unverified on Android.

## Added 11 Nov: iPhone support

- The server also listens on HTTPS (`:8443`) with a self-signed certificate
  for the LAN address, so Safari treats the crew app as a secure page and
  allows the in-page camera. The QR code on the station points to it.
- Home-screen metadata and icon; `apps/crew/ios` Capacitor project with the
  camera and local-network keys.
- Checked in headless Chrome at 402 × 874 against `https://<lan-ip>:8443`,
  with certificate errors ignored and a fake camera: secure context, live
  update after a scan made on the HTTP listener, viewfinder opened.
  **Not checked on the iPhone itself**: Safari's handling of the certificate
  warning and its camera prompt are expected to work but are unverified. The
  native iOS project has never been compiled (no full Xcode here).

## Added 14 Nov: native iOS app on a real iPhone

- Full Xcode 27.2 installed; `make ios` + build signed with a personal team,
  run on an iPhone: the crew app opens and reaches the station.
- Found on the day: the Ollama model files had been deleted from disk
  (`~/.ollama/models` empty) while `qwen2.5vl:7b` was still in RAM, so every
  scan returned 404. Re-pulled. Mission settings now shows the model in red
  ("missing — run: ollama pull …") in that case instead of green "in memory".

## Known limits (true today)

- **Vision**: 11/12 on the full test photo, 10/12 on the after-removal photo
  in the default 20 s mode (it read the emptied A1 as 1). The 50 s accurate
  mode read A1 correctly. Stacked cans (A3) are undercounted by every
  strategy and are always sent to confirmation. Nothing is known yet about a
  real shelf under venue lighting.
- **The ≤ 20 s scan target has almost no margin** (19.4 s measured) and
  depends on the laptop not throttling.
- **No Android APK**: the Android SDK is not installed on Massi's machine
  (no `~/Library/Android/sdk`, no `ANDROID_HOME`), so the Android build was
  never attempted. The Capacitor Android project exists and is configured for
  cleartext LAN HTTP. The iOS app was built and run on an iPhone on 14 Nov
  (see above). The browser path remains the fallback.
- **No OS push notification** on phones: red alerts are an in-app banner,
  refreshed every 5 s.
- **Not tested with Wi-Fi off.** An iPhone reached the station on 14 Nov, on
  a network that had internet. The phone hotspot with mobile data off, and a
  full run with the network disabled, have not been done.
- **Tauri production build** (`tauri build`) was not tried; the demo uses
  `tauri dev` (or the browser with `make station-web`).
- The forecast's weight model (7,700 kcal/kg with need recomputed from
  weight) gives large losses for long deficits (about −13 % after 460 days at
  90 % rations). It is flagged as an assumption; it has not been compared
  with a published model.
- QR codes per shelf slot (optional fallback in the brief) and periodic
  scans (off by default in the brief) were not built.
- `docs/nasa-project-page.md` still has `[cite]` placeholders: the NASA
  values have not been checked against the official resources (out 13 Nov).
- Styling uses CSS tokens and inline styles, not Tailwind as the brief asked.

## To do before / during the event

1. Massi: pull `main`, run `make test` and one full
   demo with the camera and a phone; write the result here.
2. Install the Android SDK from Android Studio if an APK is wanted, then
   `make android`.
3. Test the phone hotspot (mobile data off) with the real phone; click the
   macOS firewall and camera prompts once; write the result in
   `docs/risks.md`.
4. Mount the real shelf, calibrate the grid (Pantry → Calibrate), run a few
   live scans in both modes and note the accuracy.
5. Rehearse `docs/demo-script.md` once with the Wi-Fi off.
6. Record the 30 s video (`docs/video-script.md`).

## Built before the event

Everything in this repository as of 11 Nov 2026 (commits of 10–11 Nov), as
allowed by the local organisers. The project page draft lists it.
