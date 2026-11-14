# HESTIA — product: promise, scope, what is out

Status: proposed on 14 Nov 2026, validated by David the same day. Massi has
not confirmed it yet (see [decisions.md](decisions.md), D3).

## Promise

Help a crew far from Earth understand its health situation, follow the
relevant actions and prepare a request for assistance.

HESTIA is not a medical device. It does not diagnose. Crew data is simulated.

## Scope

| Feature | Place | Why |
|---|---|---|
| Daily check-in on the phone | Core | It is the self-assessment the challenge asks for |
| Clickable silhouette, each zone explained | Core | The challenge's own example of a good interface |
| Vigilance levels and advice | Core | "When might a result warrant attention", "what actions can be taken" |
| Earth link with the communication delay | Core | Attention "from flight surgeons on the ground" |
| History charts | Core | Lets the astronaut see a trend, not one reading |
| Camera pantry, autonomy, meal | Core of the demo, tied to nutrition | "Inadequate nutrition" is one of the health problems named by the challenge; it is also the physical moment of the demo |
| Mission contexts (Mars, transit, Moon, ISS) | Secondary | One switch at the end of the demo |
| Calibration and advanced settings | Preparation | One sentence to the jury, no screen time |
| Forecast simulator | Closing of the demo, as the next step | Shows where the project goes; its weight and bone curves are assumptions, so no figure from it is quoted |
| Gamification | Out of the main path | Optional in the challenge; takes room on the phone home screen |

"Out of the main path" does not mean deleted. No feature code is removed
without a decision recorded in `decisions.md`.

## The challenge, need by need

Source: the official challenge page, read on 14 Nov 2026
(<https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/>).
The challenge lists these as questions "worth considering" and its feature
ideas as optional.

| What the challenge asks | Screen | Explanation given to the astronaut | Check |
|---|---|---|---|
| A visual tool to assess one's own health | Crew app: Home and silhouette | Eight zones, each with a level, an icon and a word | `server/tests/` cover the status rules. Open: a profile with no data shows green (review, item 2) |
| Guidance on treatments and improvements | Alert banner, zone panel | At most four steps and an onboard procedure | Tests cover the guardrails. Open: the advice ignores the value and the level (review, item 5) |
| Which measurements can be done in space | Check-in form | Cuff, pulse, fingerstick glucose, thermometer, scale, sleep, mood, symptoms, exercise | The six indicators named by the challenge are all entered |
| Why an exam is needed | "How / why / what risk" sheet on each field; zone panel | One paragraph per field and per zone | Read on 14 Nov, not user-tested |
| How hazards affect the indicators | Zone panel, with the note of the active mission context | Each zone names its spaceflight hazard | Open: the radiation zone is labelled "Skin" (review, section 4) |
| When to alert the crew or the ground | Alerts screen, Earth link | Indicative thresholds; red goes to the crew and to Earth | Reproduced on 14 Nov. Open: every red reaches Earth, even a non-urgent one (review, item 4) |
| What actions prevent a critical condition | Advice, reminders | Steps and a named procedure | Tests cover the templates |
| Inadequate nutrition | Pantry, Meal, "Digestive / nutrition" zone | Days of food left, need per astronaut | End-to-end test pins 412 → 398 days. Open: one meal removes a whole demo lot (review, item 3) |

"Review" is
[sources/2026-11-14-counter-review-claude.md](sources/2026-11-14-counter-review-claude.md).
