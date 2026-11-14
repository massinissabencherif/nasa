# NASA Space Apps project page — draft

Copy each section into the matching field of the project page. Text in
_italics inside brackets_ is to fill in on the day.

## Project name

HESTIA — Habitat Embedded System for Tracking Individual Astronaut health

## High-level summary

A Mars base has no doctor and no internet, and Earth is up to 24 minutes away
each way. HESTIA is an offline health station for a crew of four. Each
astronaut does a daily check-in on their phone, including a reaction test
that the phone measures itself, and sees their body as a clickable
silhouette: eight zones, each green, orange or red, each explaining
which measurements feed it, which spaceflight hazard it relates to, why the
exam matters and what to do next. A camera reads the food shelf, so the crew
knows how many days of food remain and what rationing would cost them. A
simulator shows the effect of a decision (ration, exercise, a late cargo, a
solar storm) on stocks, weight, bone mass and radiation dose. When an
indicator turns red, the crew is alerted at once; when a value is critical
or several indicators are red together, a compact report is queued for Earth
with the real communication delay, so the crew acts first and the ground
confirms later. A zone with no recent reading says so instead of showing
green. All of it, AI included, runs on one laptop with no network.

## Link to project demo

_[30-second video or 7-slide deck link]_

## Link to final project

_[repository link]_

## Detailed project description

**What it does.** HESTIA has six parts:

1. **Camera pantry.** A webcam looks at a shelf with 12 fixed slots. A vision
   model running on the laptop counts the units in each slot. Uncertain
   readings are flagged and a crew member confirms them on screen. The count
   becomes days of food autonomy for the crew, a ration plan per astronaut and
   a consumption feed. Remove three boxes, scan, and the autonomy figure drops
   in front of you.
2. **Crew mobile app.** Daily check-in (blood pressure, heart rate, glucose,
   temperature, weight, sleep, mood, symptoms, exercise) and a separate
   reaction time assessment: three practice trials, then fifteen measured
   trials, with raw attempts, interruption handling and pending sync.
   Complete sessions are compared with five previous complete sessions
   of the same protocol, installation and data source. This assessment
   is informational and does not change body-zone colours or alerts. Every field has a "how to measure / why we ask / what risk"
   sheet. The app suggests a meal
   from what is really on the shelf, shows reminders adapted to the mission
   context, a check-in streak and badges, and history charts with green,
   orange and red bands.
3. **Clickable silhouette.** Brain and morale, eyes (SANS), heart, bones,
   muscles, immunity, radiation exposure, digestion and nutrition. Colour is
   always paired with an icon and a word. A zone with no reading, or only
   old readings, is shown as "no data".
4. **Alerts and Earth link.** Green: nothing. Orange: short self-care advice
   that states the value and names an onboard procedure. Red: an alert for
   the crew, starting with "tell the crew medical officer now". A report of
   under 600 characters is queued for Earth when a value is in a critical
   band or when two indicators are red together, with a countdown to its
   arrival and to the reply.
5. **Forecast simulator.** Sliders for mission horizon, ration, exercise,
   resupply delay and a solar storm, with four curves recalculated live.
6. **Mission contexts.** Mars base, Earth–Mars transit, Moon base and ISS
   change the delay, the radiation rate, the resupply and the advice.

**How it answers the challenge questions.**

- *Which measurements are feasible in space?* Cuff, pulse, fingerstick
  glucose, thermometer, scale, sleep, mood, symptoms, exercise minutes and a
  reaction test on the phone: things a crew member can do alone in a few
  minutes. The reaction test is inspired by the Reaction Self-Test used on
  the ISS; ours is a team-defined performance task, not a validated PVT, fatigue
  diagnosis or fitness-for-duty test.
- *Why is an exam done?* Each check-in field and each body zone says why.
- *How do hazards affect indicators?* Each zone is tied to one of the five
  HRP hazards and shows the indicators it moves.
- *When to alert the crew or the ground?* A published threshold table:
  orange stays with the astronaut, red goes to the crew, and Earth is
  informed for a critical value or two red indicators. Only a change is
  sent.
- *Which preventive actions?* Each zone and each alert gives at most four
  steps and names an onboard procedure.

**How it works.** A FastAPI server with SQLite runs on the laptop, with
Python engines for nutrition (Mifflin-St Jeor), status, alerts, advice and
forecasts. OpenCV captures the frame; Ollama runs the vision model locally.
The station interface is a Tauri desktop app in React; the crew app is a
React web app served by the station to phones on the base Wi-Fi.

**What is real and what is not.** The software, the vision reading, the
calculations and the alert logic are real and tested (60 automated tests).
The crew, their measurements and the ground replies are simulated and
labelled so. The shelf uses a demo scale: one box stands for one storage lot
of rations. HESTIA is not a medical device and gives no diagnosis.

**What was built before the event.** The local organisers allow preparatory
work. Built on 10–11 November 2026, before the hackathon: the whole code base
described here (server, vision pipeline, both apps, tests, documentation).
The git history shows the dates. During the event (14–15 November) we had
the project audited, reproduced and fixed five defects in the health rules
(exercise counted by day, missing data shown as missing, meals counted in
portions, reports to Earth only when justified, advice that depends on the
value), checked every reference value against its source and corrected the
attributions, added the reaction self-test, reorganised the station around
health, and _[add: tests on the real shelf and phones, calibration, video,
presentation]_.

## NASA Data

Sources were checked on 14 November 2026 from agency pages, press releases
and abstracts; see `docs/nasa-resources.md`.

| Value | Source | Where it is used in the code |
|---|---|---|
| Five hazards of human spaceflight (space radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environments) | NASA Human Research Program, "5 Hazards of Human Spaceflight" (official resource of the challenge) | `server/app/engines/status.py` (`HRP_HAZARD`), `packages/ui/src/zones.ts` |
| Career radiation limit 600 mSv | NASA-STD-3001; NASA OCHMO radiation protection technical brief | `server/data/nasa_reference.json`, `thresholds.json`, `engines/forecast.py` |
| Mars surface radiation ≈ 0.67 mSv/day | RAD instrument on NASA's Curiosity rover (Hassler et al., Science, 2014) | `nasa_reference.json` → Mars base context |
| Deep-space transit ≈ 1.8 mSv/day | RAD during Curiosity's cruise (Zeitlin et al., Science, 2013) | same file → transit context |
| One-way Mars delay about 3–22 min | NASA, "Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions" (NTRS) | `nasa_reference.json` → Earth link delay and countdown |
| Reaction Self-Test used on the ISS | NASA technical reports (NTRS 20090029851, 20140000075) | Conceptual inspiration only; our protocol is separate and not validated |
| SANS is detected by eye imaging (OCT) | NASA crew-member SANS overview (NTRS) | eyes zone text: the app cannot rule SANS out |

**Space agency partner and other data**

| Value | Source |
|---|---|
| Bone loss of about 1–1.5 % per month in flight | Canadian Space Agency, TBone studies |
| Lunar surface ≈ 1.369 mSv/day | LND instrument on the Chang'e-4 lander (Zhang et al., Science Advances, 2020) — not a NASA measurement |

Values that are **not** from a space agency and are flagged as assumptions
or demo rules in the app: the ISS dose rate (0.523 mSv/day, no source
found); 7,700 kcal per kg of body-mass change; the energy need formula
(Mifflin-St Jeor); exercise attenuating bone loss by up to 50 % at 2 h/day; a
solar storm adding a one-off dose; resupply dates; the 70 % ration safety
floor; the rules for a report to Earth; the 72-hour freshness rule; the
legacy reaction-test bands (new sessions have no colour bands); all per-item food values; the demo scale of the shelf.

Medical thresholds (blood pressure, heart rate, glucose, temperature, sleep,
mood, weight change, exercise) are common clinical ranges used as indicative
bands, not NASA flight rules.

## Use of AI

**AI inside the product, all local (Ollama on the laptop, no cloud):**

- **Vision model `qwen2.5vl:7b`** counts the units in each shelf slot. It
  does not identify products (slots are fixed and assigned) and it does not
  decide anything. Its answer is constrained to a JSON schema of one integer
  per slot. Measured on our test photo: 11 of 12 slots exact in about 19 s;
  it undercounts stacked cans, so that slot is always sent to a human for
  confirmation. Full numbers: `docs/vision-benchmark.md`.
- **Advice text.** By default, advice comes from fixed templates written by
  us, not from a model. An opt-in setting lets the same local model rewrite
  the advice. Guardrails: the prompt forbids diagnosis, drug names, doses and
  certainty; the code then rejects any answer containing such wording, more
  than four steps or no onboard procedure, and falls back to the template; an
  8-second timeout does the same. The disclaimer is appended by code.
- **What AI does not do:** it sets no threshold, colours no body zone, raises
  no alert and writes no Earth report. Those are deterministic rules.
- `gemma3:4b` was tested for the vision task, answered "1" for every slot and
  was rejected.

**The forecast is not AI.** It is a simulator: arithmetic on NASA reference
values and flagged assumptions. No model was trained.

**AI used to build the project:**

- The source code and documentation were written with AI coding assistants
  (Claude Code by Anthropic, Codex by OpenAI), directed and reviewed by the
  team. The same assistants audited each other's work during the event.
- The shelf test photos are AI-generated _[name the image tool]_. They are
  captioned "AI-generated" in the app and are only test fixtures. No NASA
  logo or mark appears in them or anywhere else.

## Space Agency Data / references

- NASA Human Research Program — 5 Hazards of Human Spaceflight
- NASA Human Research Program — Risks of Human Spaceflight
- Canadian Space Agency — Monitoring Radiation for Astronaut Health
- Canadian Space Agency — TBone studies (bone loss in microgravity)

## Tags

#health #offline #localAI #computervision #mars #nutrition #HRP
