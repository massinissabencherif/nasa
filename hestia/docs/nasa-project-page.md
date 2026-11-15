# NASA Space Apps project page — final draft (15 Nov 2026)

Copy each section into the matching field of the project page. Every statement was checked against the code on
`main` (8daaa75) on 15 Nov 2026, including Codex's corrections of the same day.

## Project name

HESTIA — Habitat Embedded System for Tracking Individual Astronaut health

## High-level summary

On a Mars base there is no doctor and no internet, and Earth is 3 to 22 minutes away each way. HESTIA is a health
station that keeps working without Earth. Each astronaut checks in on their phone and sees their body as a clickable
silhouette whose eight zones turn green, orange or red, with the reason and the next step. A photo of the food shelf
becomes a stock count that a person confirms. A simulator shows what a decision does to food, body weight, bone mass
and radiation dose. When a value is critical, the crew is alerted at once and a short report is queued for Earth with
the real delay, together with a plan to follow while waiting. Everything runs on one laptop and the crew's phones over
the base's local network: no internet, no cloud, and the AI model runs locally. Crew data is simulated; HESTIA is not a
medical device.

## Link to project demo

https://youtu.be/9PFC_OzkaCY (30-second video, English captions; also in the repository as `hestia/docs/video/hestia-30s.mp4`)

## Link to final project

https://github.com/massinissabencherif/nasa

## Detailed project description

**What it does.**

1. **Daily check-in on the phone.** Mood, symptoms, then measurements a crew member can take alone: blood pressure,
   heart rate, glucose, temperature, weight, sleep and exercise. Each field explains how to measure, why it matters
   and which risk it relates to. Readings are labelled as measured, declared or simulated.
2. **Clickable body silhouette.** Eight zones: brain and morale, eyes (SANS), heart, bones, muscles, immunity,
   radiation exposure, digestion and nutrition. Each zone is tied to one of NASA's five hazards of human spaceflight,
   shows the indicators that feed it, and pairs colour with an icon and a word. A zone with no recent reading says
   "no data" instead of showing green.
3. **Alerts.** Green: nothing. Orange: short self-care advice that states the value and names an onboard procedure.
   Red: an alert for the crew on the station and the phone, starting with "tell the crew medical officer now". Advice
   is indicative, never a diagnosis.
4. **Earth link.** A report of under 600 characters is queued for Earth only when a value is critical or two
   indicators are red together. The station shows when it reaches Earth and the earliest reply (40 minutes round trip
   in the Mars scenario), what Earth will read compared with the latest readings on board, an onboard plan to follow
   while waiting, and the conditions that mean "act without waiting for Earth". Replies from Earth are simulated.
5. **Food from a photo.** The shelf is photographed with the crew phone's own camera, with any camera the station
   laptop detects (an iPhone can serve as that camera), or imported as a photo. The crew frames it in a grid of up to
   3 × 4 slots, each assigned to a known product. A local vision model counts the packages per slot; a person
   reviews and corrects every count before it is saved. Counts become calories and days of autonomy, with an explicit
   scale (×1 for the real bin, a declared multiplier for a mission projection). The phone suggests a meal from the
   recorded stock, and logged meals remove portions from it. A labelled replay with known counts is available as a
   rehearsal fallback; it makes no claim of live AI accuracy.
6. **Management simulator.** In five confirmed steps (mission and horizon, food and cargo, daily ration, exercise,
   radiation event), the crew describes a situation and gets a saved report on food stock, body weight, bone mass and
   radiation dose. Example: with cargo 90 days late, the food runs out on day 413 and a ration of 87 % would be needed
   to reach the cargo on day 470.
7. **Also:** a reaction self-test on the phone (one practice trial, five measured trials, compared with the person's
   own earlier sessions; informational only, it changes no colour and raises no alert), measurement history, mission
   contexts (Mars base, Mars transit, Moon base, ISS) that change the delay and the radiation rate, phones that join
   the station by QR code, and an English/French interface.

**How it answers the challenge questions.**

- *Which measurements are feasible in space?* Cuff, pulse, fingerstick glucose, thermometer, scale, sleep, mood,
  symptoms, exercise minutes and a reaction task on the phone: things one person can do in a few minutes.
- *Why is an exam done?* Each check-in field and each body zone says why, with its source.
- *How do hazards affect indicators?* Each zone is linked to one of the five HRP hazards and shows the indicators it
  moves.
- *When to alert the crew or the ground?* A published rule table: orange stays with the astronaut, red goes to the
  crew, Earth is informed for a critical value or two red indicators, and only a change of level raises a new alert.
- *Which preventive actions?* Each alert gives at most four steps and names an onboard procedure; the Earth link adds
  a plan to follow while waiting.

**How it works.** A FastAPI server with SQLite runs on the laptop, with Python engines for nutrition, status, alerts,
advice, the Earth link and the simulator. Ollama runs the vision model `qwen2.5vl:7b` on the same laptop. The station
is a React interface (browser or Tauri desktop window); the crew app is a React web app served by the station to
phones on the local network (a local HTTPS address enables the in-page camera; the phone's own camera app also
works). No request leaves the base network at runtime; a
check script lists any external URL in the source.

**What is real and what is not.** The software, the calculations, the alert rules and the Earth-link logic are real
and tested: 108 backend tests and 27 frontend tests passed on 15 Nov 2026. The vision model really runs locally; on
our two AI-generated tuning images its thorough mode read 12 of 12 slots, but it has not been measured on a set of
real photos and we have seen it miscount, which is why a person confirms every count. The crew, their measurements
and the replies from Earth are simulated and labelled so. Thresholds are indicative bands and demo rules chosen by the
team, not medical protocols. HESTIA is not a medical device and gives no diagnosis.

**What was built before the event.** The local organisers allow preparatory work. Built on 10–11 November 2026: the
first version of the server, the vision pipeline, both apps, tests and documentation; the git history shows the
dates. During the event (14–15 November) we audited the health rules and fixed five defects (exercise counted by day,
missing data shown as missing, meals counted in portions, reports to Earth only when justified, advice that depends on
the value), checked every reference value against its source, rebuilt the reaction self-test, the photo-to-stock flow
with human review, the five-step management simulator and the Earth-link waiting plan, redesigned both interfaces,
added English/French, and produced the 30-second film.

## NASA Data

Sources were checked on 14 November 2026; details in `hestia/docs/nasa-resources.md` and
`hestia/server/data/nasa_reference.json`.

| Value | Source | Where it is used |
|---|---|---|
| Five hazards of human spaceflight (radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environments) | NASA Human Research Program, "5 Hazards of Human Spaceflight" (resource of the challenge) | body zones and their explanations |
| Career radiation limit 600 mSv | NASA-STD-3001; NASA OCHMO radiation protection technical brief | radiation zone, simulator |
| Mars surface radiation ≈ 0.67 mSv/day | RAD on NASA's Curiosity rover (Hassler et al., Science, 2014) | Mars base context |
| Deep-space transit ≈ 1.8 mSv/day | RAD during Curiosity's cruise (Zeitlin et al., Science, 2013) | Mars transit context |
| One-way Mars delay about 3–22 min | NASA, "Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions" (NTRS) | Earth link delay and countdown |
| Reaction Self-Test used on the ISS | NASA technical reports (NTRS 20090029851, 20140000075) | conceptual inspiration only; our protocol is not validated |
| SANS is detected by eye imaging (OCT) | NASA crew-member SANS overview (NTRS) | eyes zone: the app cannot rule SANS out |

## Space Agency Partner Data and Other References

| Value | Source |
|---|---|
| Bone loss of about 1–1.5 % per month in flight | Canadian Space Agency, TBone studies |
| Lunar surface ≈ 1.369 mSv/day | LND on the Chang'e-4 lander (Zhang et al., Science Advances, 2020) — not a NASA measurement |

Not from a space agency, and flagged in the app as assumptions or demo rules: the ISS dose rate (0.523 mSv/day, no
source found); 7,700 kcal per kg of body-mass change; the energy-need formula (Mifflin-St Jeor); exercise attenuating
bone loss; the one-off dose of a solar storm; resupply dates; the ration safety floor; the rules for a report to Earth
and for acting without waiting; the 72-hour freshness rule; per-product food values; the demo scale of the shelf.
Medical thresholds (blood pressure, heart rate, glucose, temperature, sleep, mood, weight change, exercise) are common
clinical ranges used as indicative bands, not NASA flight rules.

Tools and libraries: FastAPI, SQLModel/SQLite, React, Vite, Tauri, Capacitor, Ollama with Qwen2.5-VL, Space Grotesk and
IBM Plex fonts (open licences; full list in `hestia/docs/licenses.md`).

## Use of AI

**AI inside the product, all local (Ollama on the laptop, no cloud):**

- The vision model `qwen2.5vl:7b` counts packages in slots that a person has assigned to known products. It does not
  recognise arbitrary food, infer nutrition or decide anything; a person confirms every count before it is saved.
- Advice comes from fixed templates written by the team. An optional setting lets the same local model rewrite it,
  with guardrails (no diagnosis, drug names, doses or certainty; at most four steps; fallback to the template on any
  violation or after 8 seconds).
- AI sets no threshold, colours no body zone, raises no alert and writes no Earth report: those are deterministic
  rules. The simulator is arithmetic on reference values and flagged assumptions; no model was trained.

**AI used to build the project:**

- The code and documentation were written with AI coding assistants (Claude Code by Anthropic, Codex by OpenAI),
  directed, reviewed and tested by the team.
- AI-generated images: the shelf test photos (believed to be Google Imagen; the tool was not recorded at the time), the blood-pressure monitor
  illustration and the HESTIA companion (built-in OpenAI image tool; model identifier not returned; provenance in
  `hestia/docs/licenses.md`). They are labelled as AI-generated in the app and in the film. No NASA logo or mark
  appears in them. The unchanged Space Apps event mark and the ESGI mark appear only in student-project credits, with
  no NASA endorsement claim; HESTIA uses its own logo.
- The 30-second film was produced with AI assistance: real captures of the app, animation and sound generated by code
  written with an AI assistant (no third-party audio). AI-generated images carry a visible tag in the film, and the
  credits say "AI-assisted production".

## Tags

#health #offline #localAI #computervision #mars #nutrition #HRP #EarthIndependence
