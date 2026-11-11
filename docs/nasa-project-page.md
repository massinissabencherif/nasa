# NASA Space Apps project page — draft

Copy each section into the matching field of the project page. Text in
_italics inside brackets_ is to fill in on the day.

## Project name

HESTIA — Habitat Embedded System for Tracking Individual Astronaut health

## High-level summary

A Mars base has no doctor and no internet, and Earth is up to 24 minutes away
each way. HESTIA is an offline health station for a crew of four. Each
astronaut does a daily check-in on their phone and sees their body as a
clickable silhouette: eight zones, each green, orange or red, each explaining
which measurements feed it, which spaceflight hazard it relates to, why the
exam matters and what to do next. A camera reads the food shelf, so the crew
knows how many days of food remain and what rationing would cost them. A
simulator shows the effect of a decision (ration, exercise, a late cargo, a
solar storm) on stocks, weight, bone mass and radiation dose. When an
indicator turns red, the crew is alerted and a compact report is queued for
Earth with the real communication delay, so the crew acts first and the ground
confirms later. All of it, AI included, runs on one laptop with no network.

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
   temperature, weight, sleep, mood, symptoms, exercise). Every field has a
   "how to measure / why we ask / what risk" sheet. The app suggests a meal
   from what is really on the shelf, shows reminders adapted to the mission
   context, a check-in streak and badges, and history charts with green,
   orange and red bands.
3. **Clickable silhouette.** Brain and morale, eyes (SANS), heart, bones,
   muscles, immunity, skin (radiation), digestion and nutrition. Colour is
   always paired with an icon and a word.
4. **Alerts and Earth link.** Green: nothing. Orange: short self-care advice
   naming an onboard procedure. Red: an alert for the crew and a report of
   under 600 characters queued for Earth, with a countdown to its arrival and
   to the reply.
5. **Forecast simulator.** Sliders for mission horizon, ration, exercise,
   resupply delay and a solar storm, with four curves recalculated live.
6. **Mission contexts.** Mars base, Earth–Mars transit, Moon base and ISS
   change the delay, the radiation rate, the resupply and the advice.

**How it answers the challenge questions.**

- *Which measurements are feasible in space?* Only cuff, pulse, fingerstick
  glucose, thermometer, scale, sleep, mood, symptoms and exercise minutes:
  things a crew member can do alone in a few minutes.
- *Why is an exam done?* Each check-in field and each body zone says why.
- *How do hazards affect indicators?* Each zone is tied to one of the five
  HRP hazards and shows the indicators it moves.
- *When to alert the crew or the ground?* A published threshold table:
  orange stays with the astronaut, red goes to the crew and to Earth, and
  only a change of level is sent.
- *Which preventive actions?* Each zone and each alert gives at most four
  steps and names an onboard procedure.

**How it works.** A FastAPI server with SQLite runs on the laptop, with
Python engines for nutrition (Mifflin-St Jeor), status, alerts, advice and
forecasts. OpenCV captures the frame; Ollama runs the vision model locally.
The station interface is a Tauri desktop app in React; the crew app is a
React web app served by the station to phones on the base Wi-Fi.

**What is real and what is not.** The software, the vision reading, the
calculations and the alert logic are real and tested (52 automated tests).
The crew, their measurements and the ground replies are simulated and
labelled so. The shelf uses a demo scale: one box stands for one storage lot
of rations. HESTIA is not a medical device and gives no diagnosis.

**What was built before the event.** The local organisers allow preparatory
work. Built on 10–11 November 2026, before the hackathon: the whole code base
described here (server, vision pipeline, both apps, tests, documentation).
The git history shows the dates. During the event (14–15 November) we
_[list what was done on site: check against NASA's official resources, tests
on the real shelf and phones, calibration, video, presentation]_.

## NASA Data

> To re-check against the official challenge resources published on
> 13 November 2026 (see `docs/nasa-resources.md`). Citations marked
> _[cite]_ still need their exact reference.

| NASA value | Source | Where it is used in the code |
|---|---|---|
| Five hazards of human spaceflight (radiation, isolation and confinement, distance from Earth, altered gravity, hostile closed environment) | NASA Human Research Program _[cite]_ | `server/app/engines/status.py` (`HRP_HAZARD`), `packages/ui/src/zones.ts` |
| Mars surface radiation ≈ 0.67 mSv/day | MSL Curiosity RAD instrument _[cite]_ | `server/data/nasa_reference.json` → Mars base context, forecast radiation curve |
| Deep-space transit ≈ 1.8 mSv/day | MSL RAD cruise measurements _[cite]_ | same file → transit context |
| Lunar surface ≈ 1.369 mSv/day, ISS ≈ 0.523 mSv/day | _[cite]_ | same file → Moon and ISS contexts |
| Career radiation limit 600 mSv | NASA-STD-3001 _[cite]_ | `thresholds.json` (`radiation_pct_of_career_limit`), `engines/forecast.py` |
| Bone loss 1–1.5 % per month in flight | NASA HRP _[cite]_ | `nasa_reference.json`, `engines/forecast.py::bone_loss_pct_per_month` |
| Energy requirement ≈ 12,000 kJ/day (≈ 2,870 kcal) | _[cite]_ | shown as a comparison next to the computed need (Pantry, Meal) |
| One-way Mars delay 4–24 min; Moon ≈ 1.3 s | light-time _[cite]_ | `nasa_reference.json` → Earth link delay and countdown |
| O₂ ≈ 0.82 g/min and CO₂ ≈ 1.04 g/min per person; ISS water recycling 98 % | _[cite]_ | stored in `nasa_reference.json`, not used in a calculation |
| SANS (Spaceflight-Associated Neuro-ocular Syndrome) | NASA HRP _[cite]_ | eyes zone text |

Values that are **not** from NASA and are flagged as assumptions in the app
(Forecasts → Assumptions & sources): 7,700 kcal per kg of body-mass change;
exercise attenuating bone loss by up to 50 % at 2 h/day; a solar storm adding
a one-off dose (10–500 mSv, default 50); resupply for Moon (6 months) and ISS
(2–3 months); "next cargo in N days" for each context; the 70 % ration safety
floor; the orange band at 70 % of the radiation limit; diastolic blood
pressure bands; all per-item food values; the demo scale.

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

- The source code and documentation were written with an AI coding assistant
  (Claude Code, Anthropic), directed and reviewed by the team.
- The shelf test photos are AI-generated _[name the image tool]_. They are
  captioned "AI-generated" in the app and are only test fixtures. No NASA
  logo or mark appears in them or anywhere else.

## Space Agency Data / references

_[list the official challenge resources actually consulted, after 13 Nov]_

## Tags

#health #offline #localAI #computervision #mars #nutrition #HRP
