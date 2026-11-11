# Risks and fallbacks

| Risk | Likelihood | What we do about it |
|---|---|---|
| Vision is slow or wrong on the real shelf (venue lighting, glare, stacked items) | High | Fixed, calibrated slots (the model only counts, it never has to find or identify). Uncertain readings ask for an on-screen confirmation. "Accurate mode" (3 row crops, ~50 s). Last resort: the replay scan, which needs no camera and no AI. QR codes per slot were considered as an identification fallback and not built: slots are fixed, so identification is not the weak point. |
| A live scan takes ~20 s of silence on stage | Certain | Per-slot progress bar; the presenter talks over it. The replay scan is instant if time is short. |
| Laptop heats up or throttles with the model loaded | Medium | Scans are on demand only (no periodic scan). One model in memory, loaded at server start, kept for 30 min. Advice text uses fixed templates by default, so the LLM is idle outside scans. |
| 16 GB RAM: two models at once would swap | Medium | Only `qwen2.5vl:7b` is ever loaded; it does both vision and (opt-in) text. `gemma3:4b` is not used at runtime. |
| Ollama not running | Low | The station shows it under Mission settings; camera and test-image scans return a clear message; everything else, including replay scans, alerts, forecasts and the crew app, keeps working. |
| Mobile build blocked (Android SDK not installed, no full Xcode) | Happened | The crew app is the same web app, served by the station at `/crew/`. Phones open it in their browser from the QR code. The Capacitor Android project is ready for when the SDK is there. |
| Venue Wi-Fi is flaky, filtered or isolates clients | High | Do not use it. Dedicated base network: a phone hotspot with mobile data switched off, laptop and phones joined to it. Alternative: a travel router without uplink. Not assumed: an internet-less hotspot hosted by macOS (unreliable). |
| Hotspot isolates clients from each other | Medium | Test the exact phone the day before. Fallback: show the crew app in a phone-sized browser window on the laptop (`http://localhost:8000/crew/`). |
| Phone cannot reach the station (firewall) | Medium | macOS asks once to allow incoming connections for Python: click Allow before the demo. The crew app shows "Station unreachable" with a link to the address setting. |
| iPhone shows "connection is not private" on the HTTPS address | Certain, once | Expected: the station signs its own certificate. Accept it before the demo (Show Details → visit this website). If Safari refuses, use the plain `http://…:8000/crew/` address: everything works except the in-app viewfinder. |
| Camera permission prompt appears mid-demo | Medium | Run one live scan before going on stage so macOS has already asked. |
| An Earth message was queued too early and has already "arrived" | Low | The red alert is triggered live (check-in or demo button), so the countdown starts on stage; "Reset" clears everything. |
| The demo script numbers drift (412 → 398) | Low | Seeded data and a test that pins both values (`test_demo_e2e.py`). The autonomy readout shows whole days. |
| Someone reads the app as medical advice | Low | "SIMULATED" and "Not a medical device" on every screen; advice ends with a disclaimer added by code; LLM output is checked for drug names, doses and diagnosis wording and replaced by a template if it fails. |
| NASA publishes different reference values on 13 Nov | Medium | All values live in `server/data/nasa_reference.json` and `thresholds.json`; see `docs/nasa-resources.md` for the update checklist. |

## Tested network setup

Status on 11 Nov 2026:

- Tested: everything on the laptop alone, and the crew app loaded from the
  laptop through its LAN address (`http://192.168.1.134:8000/crew/` on a home
  Wi-Fi), in a phone-sized browser window.
- **Not tested yet: a physical phone**, and the phone-hotspot setup with mobile
  data off. Both must be tried with the actual phone before the event. Update
  this section with the result (model of phone, whether clients can see each
  other, whether macOS showed the firewall prompt).
