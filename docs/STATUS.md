# HESTIA — status

## Phase 6 — Alerts + LLM advice with guardrails + Earth link (done)

**Alert engine** (`app/engines/alerts.py`, new): `evaluate_and_alert()` checks
every alertable indicator (BP, HR, glucose, temperature, sleep, mood, weight
trend, exercise streak, symptoms, radiation) for a crew member and creates an
`Alert` only when the level actually *changed* — re-running it at the same
level is a no-op, so check-ins don't spam duplicate alerts (PROMPT_FABLE.md
§7: "only significant changes are sent"). A red alert also queues an
`EarthMessage` with a real one-way delay from the active context. Wired into
`POST /api/crew/{id}/checkin` (runs after measurements are saved) and reused
by `seed.py` — the two scripted demo anomalies and all seeded data now go
through the exact same detection path a live check-in would use, instead of
hand-written rows.

**Guardrailed advice** (`app/engines/advice.py`, new): deterministic
templates are the default per PROMPT_ADDENDUM.md #2 — ≤4 numbered steps, one
named onboard Procedure, always ends with "not a diagnosis". The LLM path is
opt-in (toggle in Mission settings), uses `qwen2.5vl:7b` in **text mode**
(never `gemma3:4b`, never alongside the vision model), has an 8s timeout, and
falls back to the template on *any* failure — verified both paths live:
~4.4s for a real guardrailed LLM response, and confirmed the fallback fires
correctly when forced to time out.

**Earth link, fully modeled**: `EarthMessage` now carries the full round
trip — `deliver_ts` (arrival at Earth) and `reply_ts` (simulated reply back,
one more one-way delay), with `status` (queued → delivered → replied)
computed live from current time rather than stored and drifting. A scripted,
clearly-labeled "(SIMULATED REPLY)" ground response is generated at queue
time and revealed only once `reply_ts` passes. `POST /api/earth/advance`
fast-forwards all queued/pending messages by N seconds — verified the full
queued → delivered → replied progression live via two "+20m" clicks. Mission
settings also got a **time-scale** control (×1/10/30/60, applied to new
alerts' delay) satisfying the brief's "time-scale factor for demos" ask
separately from the manual skip-ahead button.

**On-screen red alerts on mobile**: crew app's Home shows an unacked red
alert as a full banner (message + "Sent to Earth" + Acknowledge), satisfying
the "on-screen" half of PROMPT_FABLE.md §7's "on-screen + mobile notification
banner" — a real OS push notification isn't wired (Capacitor native bridge
is phase 9 territory), noted honestly below rather than glossed over.

**Tests**: 31 pass (5 new in `test_alerts.py`) — both scripted anomalies
produce the expected alerts, a red alert queues a correctly-delayed Earth
message, unchanged levels don't duplicate, a level change does create a new
alert, and every deterministic template ends with the disclaimer and stays
within the step budget.

## Known gaps / not yet done

- No true OS-level push notification for red alerts (needs Capacitor's
  native notification plugin — phase 9).
- Forecast simulator (phase 7), gamification (phase 8) still pending.
- The LLM advice path is opt-in and works, but hasn't been exercised through
  the full check-in → alert → Earth pipeline in one live run this session
  (verified the advice engine directly instead, for speed).

## Next

Phase 7 — Forecasts (M5) + multi-environments (M6): sliders (mission
duration, ration %, exercise, resupply delay, solar storm) driving stock/
weight/bone/radiation curves, reusing the nutrition engine and
`nasa_reference.json` already in place; context switching already works
end-to-end from phase 1, this phase is mainly the forecast math + UI.
