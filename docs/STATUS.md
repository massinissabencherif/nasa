# HESTIA — status

Last update: 11 Nov 2026 (pre-event). All phases 0–10 of the brief have been
worked through. This file says what works, how it was checked, and what is
still open.

## What works, and how it was verified

| Area | State | Verified by |
|---|---|---|
| Backend engines (nutrition, thresholds/status, alerts, advice, forecast, gamification) | done | `make test`: 52 tests pass |
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

## Known limits (true today)

- **Vision**: 11/12 on the full test photo, 10/12 on the after-removal photo
  in the default 20 s mode (it read the emptied A1 as 1). The 50 s accurate
  mode read A1 correctly. Stacked cans (A3) are undercounted by every
  strategy and are always sent to confirmation. Nothing is known yet about a
  real shelf under venue lighting.
- **The ≤ 20 s scan target has almost no margin** (19.4 s measured) and
  depends on the laptop not throttling.
- **No APK**: the Android SDK is not installed on this machine (no
  `~/Library/Android/sdk`, no `ANDROID_HOME`), and there is no full Xcode, so
  neither mobile build was attempted. The Capacitor Android project exists
  and is configured for cleartext LAN HTTP. The browser path is the
  supported one.
- **No OS push notification** on phones: red alerts are an in-app banner,
  refreshed every 5 s.
- **Not tested on a physical phone, and not with Wi-Fi off.** Phone access was
  only simulated from the laptop through its LAN address. A run with the
  network disabled was not done in this session.
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

1. 13 Nov: follow `docs/nasa-resources.md`, fix values and citations.
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
