# HESTIA — status

Last update: 14 Nov 2026 (first day of the event). This file says what
works, how it was checked, and what is still open. Decisions are in
[decisions.md](decisions.md).

## 14 Nov — consolidation

Four local branches, stacked, **not merged and not pushed**. The commits are
unsigned because the signing key could not be unlocked from the agent's
shell; they can be re-signed before pushing.

| Branch | Content |
|---|---|
| `chore/agents-docs` | `AGENTS.md`, documentation index, `product.md`, `decisions.md`, old briefs marked as history |
| `fix/health-rules` | The five defects below, science wording and sources |
| `feat/reaction-test` | Reaction self-test; station navigation health first |
| `chore/shared-skills` | Five shared skills, advice hierarchy, this documentation |

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

- The seed and the meaning of meal events changed: run `make reset` once
  after pulling these branches.
- Nothing was run on a physical phone, with the vision model, on a real
  shelf or in the Tauri window on 14 Nov by the agent.
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

1. Massi: pull the branches, `make reset`, run `make test` and one full
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
