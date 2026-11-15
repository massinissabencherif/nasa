# HESTIA — decisions

One line per decision. A decision has four possible states: **proposed**,
**decided**, **implemented**, **verified**. Do not skip a state: "decided"
says nothing about the code.

## Decided

| # | Date | Decision | Decided by | State | Reason / source |
|---|---|---|---|---|---|
| D1 | 14 Nov 2026 | The team builds HESTIA, not Field Shift | David, Massi | decided | A working prototype against a research file with no code. [Counter-review](sources/2026-11-14-counter-review-claude.md), section 1 |
| D2 | 14 Nov 2026 | Work done on 10–11 Nov stays in the git history as it is and is declared on the NASA project page | David | decided | The local organisers allow preparatory work. David confirms this also covers international eligibility; the agents did not check it themselves |
| D3 | 14 Nov 2026 | Scope as written in [product.md](product.md): check-in, silhouette, alerts, Earth link and history are the core; the pantry is in the main demo; forecasts close the demo as the next step; calibration gets one sentence; gamification leaves the main path | David (Massi to confirm) | decided, not implemented | Five minutes of demo; fit with the challenge text |
| D4 | 14 Nov 2026 | No feature code is deleted without a line in this file | David | decided | "Not in the pitch" is not "to remove" |
| D5 | 14 Nov 2026 | `AGENTS.md` at the repository root is the only rule file for agents; `CLAUDE.md` imports it; `docs/prompt/` is history | David | implemented; merged into `main` through `5ff5ef3` (D14) | Two agents, two people, one set of rules |
| D6 | 14 Nov 2026 | The exercise minutes of a check-in are the total for that calendar day; the latest check-in of a day replaces the earlier ones; a streak counts days | Fable, under David's delegation — **David and Massi to confirm** | implemented, verified by tests | Seven check-ins in one day counted as seven days. Rule text: `server/data/demo_rules.json` |
| D7 | 14 Nov 2026 | A report goes to Earth when one red indicator is in its critical band, or when two or more indicators are red together. A single red reading outside the critical band stays with the crew. Critical bands: systolic ≥ 180 or < 80, diastolic ≥ 120 or < 50, heart rate > 130 or < 40, temperature ≥ 39.5 or < 35.0, glucose ≥ 250 or < 55, dose > 100 % of the limit | Fable, under David's delegation — **David and Massi to confirm the bands** | implemented, verified by tests | A systolic pressure of 140 alone queued a report. These are demo rules, not a medical protocol |
| D8 | 14 Nov 2026 | A meal removes real portions; a shelf scan adds or removes boxes, each box being a whole lot at the demo scale. **A box removed between two scans is no longer attributed to the person who logged a meal just before** | Fable, under David's delegation — **David and Massi to confirm, since a behaviour was removed** | implemented, verified by tests | One 212 kcal meal removed 44,944 kcal. Attributing a whole lot to one meal has no meaning at the demo scale |
| D9 | 14 Nov 2026 | A zone with no reading is "no data", and a zone whose newest reading is older than 72 h is "no recent data" with its last level kept aside. Neither is shown green. The cumulative radiation dose is exempt | Fable, under David's delegation | implemented, verified by tests | A profile with no measurement showed eight green zones |
| D10 | 14 Nov 2026 | Removed from the app and the data: the "12,000 kJ/day NASA reference" and the unused O₂, CO₂ and water-recycling figures. The radiation zone is labelled "Radiation exposure", not "Skin". The lunar dose rate is attributed to Chang'e-4 | Fable, under David's delegation | implemented | No source found, or wrong attribution. See `nasa_reference.json`, "sources" |
| D11 | 14 Nov 2026 | A reaction self-test is added to the check-in: five signals, measured by the phone, compared with the astronaut's own baseline, capped at an orange advice | David chose the idea; rule details by Fable under delegation | implemented, verified by tests and by a replay in a headless browser | "Measured, not typed". Inspired by NASA's Reaction Self-Test on the ISS; this short version is a screening aid, not a validated test |
| D12 | 14 Nov 2026 | The station opens on Crew and its navigation is health first; streak and badges are collapsed on the phone; the forecast screen is named "What-if simulator" | Fable, applying D3 | implemented | The challenge is about health self-assessment |
| D13 | 14 Nov 2026 | Five shared skills live in `.agents/skills/`; `.claude/skills` is a symlink to it | Fable, applying the consolidation brief | implemented; discovery verified in Claude Code and Codex on David's Mac | One source for both agents. See [ai-workflow.md](ai-workflow.md) |

### Decisions following consolidation:

- **D14 (decided and verified, 14 Nov):** David and Massi approved merging
  the completed consolidation. Astra fast-forwarded and pushed `main` to
  `5ff5ef3`; 60 backend tests and both web builds passed before publication.
- **D15 (implemented and software-verified, 14 Nov):** David approved the
  reaction-test first lot from the [new brief](prompt/2026-11-14-health-assessments-fr.md).
  Evolve the existing test to 3 unrecorded practice trials and 15 measured
  trials, version and store its raw attempts, compare only with 5 previous
  complete sessions of the same protocol, installation and data source.
  D15 supersedes D11 for new sessions. New sessions are informational:
  no automatic colour, alert or Earth report.
  Existing `reaction_ms` measurements and their old colour rule remain legacy
  data, separate from the new protocol. Additive tables preserve existing data.
  Verified: 69 backend tests, 10 frontend tests, both builds and Chrome
  crew/station paths; physical hardware remains unverified. Uncommitted on
  `feat/reaction-protocol`. Wellbeing and injury specifications below are
  not authorised for coding yet.

- **D16 (decided, not implemented, 14 Nov):** David chose **Space Grotesk**
  (font comparison B), retaining Plex Mono for numbers, and the original
  navy/vivid cyan palette. He rejected the softened graphite/cyan palette.
  The large silhouette and eight visible zones stay central; the first
  redesign made the body too small. Keep the clearer copy and timestamps.
  Fable is to develop restrained character, measurement icons and visual
  depth around existing functions. This direction supersedes the Plex Sans
  line in hestia-ui-polish; it does not change health colours' meanings,
  health rules or the reaction protocol. Specific layouts, icon drawings,
  the monogram and a mascot are not all approved by this decision.
- **D17 (authorised and prepared, 14 Nov):** David explicitly approved a
  repository handoff with the [Fable brief](prompt/2026-11-14-fable-ui-handoff-fr.md),
  [mockups](design/2026-11-14/README.md), [audit](sources/2026-11-14-design-system-audit.md)
  and linked documentation updates, **without application-code changes**.
  This pass does not authorise a commit, push, merge, installation or
  external communication. The next implementation lot still follows
  AGENTS.md. The existing reaction work remains uncommitted.
- **D18 (implemented and verified in a browser, 14 Nov, not committed):**
  UI lot 1, "foundations", done by Fable on David's "à toi". It applies D16
  and changes no health rule, colour meaning or reaction behaviour. Space
  Grotesk is bundled locally (weights 400–700, latin subset, OFL licence
  text beside the files); Plex Mono stays for readings and Plex Sans is the
  fallback. Text colours were raised to at least 4.5:1 on the panel
  surfaces: `--text-faint` is now `#8090a0`, `--text-muted` `#9ba6b3`, the
  old tone is kept as `--decor` for non-text marks, and green/red/orange get
  an ink colour for small status text. Buttons share hover, pressed,
  loading and a 44 px touch height on touch devices; navigation announces
  the current page; seven instrument icons were added for the check-in
  fields. Two wrong texts were corrected (meal attribution removed by D8;
  escalation described as in D7).

- **D19 (implemented and checked in a browser, 14 Nov, not pushed):** UI lots
  2 and 3 of the handoff, done by Fable on David's "prends toute la suite".
  They change no health rule, colour meaning or reaction protocol.
  *Check-in:* three steps (Feel, Measure, Review) with a stepper, back
  navigation that keeps every answer, a review before saving that lists each
  value with its unit, and a failed save that keeps the answers. A skipped
  question stays unknown: the review says "Not answered" for mood and "None
  selected" for symptoms, never "none", because the station cannot tell a
  skipped question from a no (open point below). *Home:* a visible primary
  action with the state of the day, "Your body" with the age of the last
  reading. *Reaction test:* an interrupted session is titled "interrupted";
  the main action is "Restart from practice" and the back button names where
  it goes. *History:* each series states its newest value, date and origin.
  *Meal:* the estimated need is separate from what was logged. *Station
  crew board:* "Checked in today", "No check-in today", "Data too old" and
  "No data yet" are different; a stale reading keeps its number but loses its
  colour; an old board is never badged "nominal". *Depth (D16):* the detail
  a person just opened (the station body-status panel, the zone panel on the
  phone) is the only lifted surface: a lighter fill, a brighter border and a
  plain dark shadow, no glow; the station scrolls it into view, without
  motion when the person asked for none. Small red and green text outside
  the shared components now uses the readable ink colours.

- **D20 (implemented, checked in a browser, 14 Nov, not pushed):** after
  David looked at the running app and said the home screen did not explain
  what to do and the product lacked character. *Home* is now built around
  "Today's routine": one sentence on what the daily check is for, the main
  action with its duration, then exercise, meals and the optional reaction
  test with their state, and a legend of the colours under the body.
  *Identity:* a HESTIA mark (a habitat dome with a vital-signs trace) in both
  apps, and an icon per body zone in the same family, shown in the zone
  panel; instrument icons carry the level on the station crew board.
  *Calm when fine:* a nominal zone is filled lightly and its word is in a
  quiet tone, so orange and red are what the eye finds first; the meaning of
  the colours is unchanged. Panels get a hairline of light on their top edge
  and a larger radius. The mark and the icon drawings are proposals to
  confirm with David and Massi, as D16 already said for the monogram.


- **D21 (implemented, 15 Nov):** under David's continuation/delegation, add
  authored French UI alongside English, shared numeric/input/help controls,
  contextual sheets, restrained background and short transitions. English
  remains the fallback; this overrides the English-only UI line in AGENTS for
  this approved scope. It is not a complete localization or component migration.
- **D22 (implemented, 15 Nov):** full desktop profiles replace side-sheet
  profiles. Results have an explicit route/section and Home shortcuts; readings
  and actions precede optional explanation. Selected-zone illustrative anatomy
  animates briefly, with reduced motion. No health logic/protocol changed.
- **D23 (implemented, 15 Nov):** use pinned Prettier and workspace-wide Oxlint;
  format frontend sources. Existing React warnings remain visible. No backend
  lint setup or CI claim. No commit/push authorisation is implied.
- **D24 (verified with limits, 15 Nov):** real local Ollama pipeline/API scans
  and human corrections ran on disposable data. Counts are not automatically
  trustworthy; replace misleading unconfirmed “OK” labels. Correct the scorer's
  mistaken A1=2 expected value to the visibly empty A1=0. See the
  [complete evidence and request register](sources/2026-11-15-interactions-and-evidence.md).
  Mascot illustration is present; its identity is still a proposal.

- **D25 (implemented, browser-checked, 15 Nov):** David explicitly approved a
  focused heart revision: 44→29 drawing units, filled anatomical colours,
  remove the duplicate heart in the detail header and the large cyan selection
  box at pointer activation, retain keyboard focus, group its three desktop
  readings. Colours are illustration pigments, not status colours; no thresholds
  or readings change. Shared motion tokens/CSS supply one finite 680 ms transform
  sequence and reduced-motion support, without per-frame React work or another
  dependency. Final visual review with David precedes other organ revisions.
  [Evidence](design/2026-11-15/README.md#heart-follow-up).

- **D26 (implemented, browser-checked, 15 Nov):** approved follow-up replaces
  skeletons with one shared spinner; distinguishes request errors/missing profiles
  from loading; adds authored brain/eye/muscle drawings, compact persisted language
  switch and structured help. Later steering explicitly restores blue selection
  frames/backgrounds on **all** body zones; padding prevents the word “normal”
  from touching the frame. Keyboard focus stays visible. Colours of anatomy remain
  independent of status colours. Muscles concern the whole body; the exercise and
  weight indicators are proxies, not muscle measurements.
  The heart repeats while selected and visible; user pause, offscreen/hidden-page
  pause and reduced motion override playback. This explicitly supersedes D25's
  finite heart animation and the skill's generic no-loop preference. Shared CSS
  and tokens own the motion; visibility events do not run every animation frame.
  The brain/eyes/muscles only fade in. FAQ separates internet from local Wi-Fi,
  fictional records from research, and colour rules from medical validation.
  Zone explanations preserve threshold order/bounds and translate known display
  strings without changing numbers. No health-engine changes or new dependency.
  [Evidence](design/2026-11-15/README.md#anatomy-loading-and-language-follow-up).

- **D27 (implemented, browser-checked, 15 Nov):** David approved removing the
  decorative cyan edge of detail sheets in favour of a neutral outline, and
  adding measurement pictograms before labels while keeping health status symbols
  beside values. Mood, reaction and symptoms use original SVG drawings; sleep
  reuses the shared moon. All zone indicators use the shared measurement mapping.
  Symbols have accessible status names; decorative measurement icons accompany
  visible labels. This supersedes the sheet edge treatment in D21, not the blue
  body-zone selection backgrounds restored in D26. No health rules, dependency
  or new motion. [Evidence](design/2026-11-15/README.md#measurement-icons-and-neutral-sheets).

- **D28 (implemented, 15 Nov):** David approved the gear/scroll corrections and
  the grouped crew lot: HESTIA home navigation, discreet author credits, one Home
  action block, removal of its routine/badge accordions and duplicate reaction
  card, history icons/translations, illustrated meal cards with explicit portions
  and save feedback, and compact zone references with optional full rules.
  His follow-up removes the top edge from **every bottom sheet**, including
  field/symptom help; desktop side sheets retain a neutral outline. Units stay
  beside ranges; their explanations remain keyboard/touch accessible.
  The selected zone is framed only when hidden, on sufficiently tall mobile
  viewports; the original scroll/focus returns on close. Short screens prioritise
  reading space. Observers run on layout changes, with reduced-motion support.
  No health thresholds, reaction protocol or food calculations changed. A
  suggested meal still uses multiple requests: confirmed portions are shown even
  if a later request fails, with an instruction to verify before retrying.
  No transactional/idempotent meal endpoint was added.
  [Evidence](design/2026-11-15/README.md#crew-navigation-meals-and-compact-explanations).

- **D29 (implemented, 15 Nov):** David approved a compact generated monitor
  illustration in systolic, diastolic and resting-pulse help. A UI overlay marks
  SYS/DIA/PULSE without altering the source image or inventing readings. The
  complete device is behind “View the device”; a generated/concept caption remains
  visible. This is fictional educational HESTIA hardware, not a depiction of
  certified NASA equipment. The local image weighs about 1.86 MB; hardware/network
  performance is not benchmarked. No real measurement or automatic camera reading
  is introduced by this illustration.
  **Visual follow-up:** David found the display crop unrecognisable and the
  expandable second image redundant. Show the complete device once at the sheet
  width, retain the relevant row overlay, and remove “View the device”. This
  supersedes D29's initial cropped-preview/optional-full-image presentation.

- **D30 (implemented, browser-checked, 15 Nov):** David approved continuing
  shared components while Claude handles vision separately. Button/Panel styles
  and interactive states are centralised, with tokens and reduced motion; mood,
  symptoms and history now reuse Button. Keep native semantics and avoid new
  dependencies. Busy buttons stay focusable without reactivating; 44 px coarse
  pointer targets now survive size variants. No health or vision logic changed.
  Claude's separate worktree/database avoids concurrent file and data changes;
  its creation has not been observed by Astra. Do not treat a worktree from HEAD
  as containing Astra's uncommitted UI pass.

- **D31 (implemented, browser-checked, 15 Nov):** David approved credits,
  favicon, mission illustrations and motion, with Pantry as the UI priority.
  Following his further feedback, the photo itself opens a slot review showing
  the relevant crop and its editable count. Counts and calorie estimates keep
  their origin/uncertainty; technical/demo sources and ration scenarios are
  secondary. Shared sheets now have entry/exit motion, a cancellation fallback,
  reduced motion and focus restoration. Keep native controls and existing tokens.
  Earth/Moon/Mars/ISS cues are authored vector artwork. ESGI and **NASA Space Apps**
  logos are allowed in project credits, unaltered and identified as event/school
  context; this is a limited exception to the old blanket mark rule, approved
  by David after discussing the brand guide. NASA institutional insignia remains
  excluded. HESTIA keeps its own identity; mobile health screens keep their space.

- **D32 (integrated locally, 15 Nov):** David approved importing Claude/Fable's
  vision work from `fix/vision-reliability` at `34c8962`, including evidence.
  Seven server/test files were applied without a commit or branch merge, plus
  local-photo ignore rule and new reports. Station Pantry exposes `cross` as its
  default photo method, with `full`/`row` alternatives and explicit no-AI replays.
  Photo warnings are returned in HTTP/SSE and translated in the station UI.
  Integration adds a guard/test for a non-object JSON stack answer. Crew's current
  photo page retains its older full/row choice; harmonising that UI is still open.
  **Evidence:** Claude measured 24/24 exact counts on the TWO tuning fixtures,
  not a holdout or real shelf; 75 tests passed before import, 76 after the guard.
  No fresh Ollama accuracy benchmark was run by Astra. No real-camera validation.
  [Imported report](sources/2026-11-15-vision-cross-check.md).

- **D33 (preview only, 15 Nov):** David requested a cleaner shelf image. A new
  captioned synthetic candidate is saved with [provenance](sources/assets/shelf-demo-v2-candidate.md).
  The current fixtures and scanner source choices remain unchanged. Before using
  it as a test: human count, image-specific grid calibration and an unchanged-model
  evaluation. It is not evidence of reliability in an actual habitat.

- **D34 (implemented and checked, 15 Nov):** David approved the photo/camera
  workflow. Live image/camera analysis stages a short-lived proposal; only human
  review saves stock. Unrelated/unclear-scene rejection precedes counting. Failed,
  stale, expired and duplicate saves are explicit. No scene check or confidence
  score establishes reliability. Mock-only replay is still clearly labelled.
- **D35 (implemented and checked, 15 Nov):** David requested movable corners,
  whole-frame movement and chosen row/column counts. Per-photo grids support up
  to 3×4 known slots, always labelled from A1. Product assignment now opens inside
  capture, preserving the photo. It is saved station-wide and invalidates the
  previous quantity for changed products. Unseen stock is preserved, not erased;
  changing dimensions does not move product assignments. This is constrained
  counting, not free recognition or a trained custom model.
- **D36 (implemented and checked, 15 Nov):** David's latest choice is one
  full-width active-mission simulation action with its illustration and a link
  to change mission in Settings, plus one supply-delay action. Physical package
  counts precede the ×212 demo projection. Header shows active mission; Settings
  separates operational, presentation and AI controls. Guide topics/short steps
  replace the accordion pile; the existing mascot identifies help. Shared motion,
  keyboard and reduced-motion rules remain. See the [review and remaining limits](sources/2026-11-15-camera-review-and-pantry.md).

- **D37 (implemented and checked, 15 Nov):** David approved one practice trial
  and five measured trials. `reaction-5-v1` is the current protocol; the previous
  `reaction-15-v1` remains accepted for stored/pending sessions. References never
  mix protocols. Waits remain random 2–5 seconds. This is a short prototype task,
  not a validated clinical test; no change to health colours or Earth alerts.
- **D38 (implemented and checked, 15 Nov):** prepare products and explicitly
  empty stock under Settings → Presentation tools, not Pantry. Custom catalogue
  entries require package kcal/protein/carbohydrate/fat values. Emptying stock
  sets counts to zero and removes the current photo, retaining products,
  assignments, crew, health and historical records. Confirmation is required.
  A review defaults to preserving unseen slots; the explicit whole-new-reserve
  choice zeros unseen slots when saving, preventing old demo quantities from
  being retained after moving the same products. No automatic data reset.
- **D39 (implemented and checked, 15 Nov):** all eight frame handles resize;
  only the inset centre moves. Labels no longer sit behind a Move badge. Review
  and overview crop to analysed boxes. Rejections are focused beside Analyse;
  waiting shows the existing mascot, elapsed seconds and an honest next step.
  Simple/Thorough reading labels replace the unexplained cross-check label.
- **D40 (implemented and checked, 15 Nov):** David approved stacking preparation
  and Earth-clock panels beside scenarios to remove the row-height gap. Product
  preparation shows unused products and their existing slot assignments.
  Multiple slots with one product are allowed, with an informational caution
  about recounting moved packages. No automatic deduplication or stock removal.
  Sheets fit 390px; the station shell itself still overflows at that width.

- **D41 (implemented and checked, 15 Nov):** David approved a subtle repeating
  companion float during analysis, with pause, reduced motion and hidden/offscreen
  guards. Animation stays in shared CSS/tokens. The repeated companion captions
  are removed; provenance is consolidated in project credits. This explicitly
  supersedes AGENTS' per-occurrence caption requirement for the companion only.
- **D42 (implemented and checked, 15 Nov):** catalogue products can be edited
  through a centred modal reusing native dialog/focus handling. Values are per
  whole package; editing recalculates existing meal nutrition, explicitly disclosed
  and approved by David. Counts and meal records are not deleted. Presentation
  settings expose a global integer multiplier (1–10000), with ×1 and the catalogue
  demo default (212) presets and explicit save. It affects projections and available
  demo meal portions, not the number of photographed packages. A full demo reset
  restores the original scale. Catalogue/scale changes invalidate pending photo
  proposals. Package kcal before scaling/later meals is a separate server result.
  Duplicate food locations aggregate before meal subtraction, once per product.
- **D43 (implemented and checked, 15 Nov):** instead of attempting a full phone
  redesign of station administration, viewports below 768px show an orientation
  screen linking to the crew app. The desktop shell is unmounted at this width.
  This is layout guidance, not authentication or a security boundary. Phone LAN
  reachability still depends on the server/network; no Xcode work.

- **D44 (copy implemented, 15 Nov):** David approved a discreet statement in
  Guide → Pantry about a fixed-camera/periodic-image future. It explicitly says
  automatic capture is not available today; no scheduler or live-inference feature
  is added. His positive feedback on thorough mode is user-observed, not a new
  benchmark. The remaining-work register is prioritised for rehearsal and delivery.

- **D45 (decided, handover corrected, 15 Nov):** David approved consolidation and
  publication on `main`, including the exact commit message
  `feat: consolidate HESTIA demo flows and team handoff`. After
  reviewing the first handover, he rejects reserved frontend ownership and a
  predetermined task list for Massi. The [restart guide](reprise-2026-11-15-fr.md)
  offers the outstanding UI requests and other tasks to either contributor.
  Record a chosen task's branch/scope before working to avoid collisions.
  The broad Fable mission is withdrawn; only an [optional context restart](prompt/2026-11-15-fable-final-readiness-fr.md)
  remains, without an assigned implementation task. Nothing is scheduled or sent,
  and no agent should infer permission to code from discovering that message.

- **D46 (implemented and browser-checked, 15 Nov):** David approved a UI-only
  pass on reaction results and body-zone explanations, preserving calculations,
  thresholds, palette and existing motion. His follow-up chooses vertical bars
  for the short reaction test, a prominent median and a compact screen with
  visible return/restart actions. Long historical sessions retain horizontal
  bars. Details explain comparisons and limitations without crowding the result.
  Zone explanations reuse the Guide's typography/notes, with compact references
  and full ordered rules available on demand. No claim of clinical validation or
  physical-device validation. Work is on `fix/reaction-zone-clarity`, uncommitted;
  [verification](design/2026-11-15/result-zone-clarity.md).

- **D47 (implemented and browser-checked, 15 Nov):** David approves a shared
  mission explanation, stable mission selection and compact Settings/Pantry
  hierarchy. He then asks for provenance under the QR, key figures before prose
  and an astronaut helmet for Crew. Mission descriptions are HESTIA scenarios,
  not NASA mission plans; dates and fixed delays are labelled demo assumptions.
  No request on reselecting the active mission. The shortfall is rounded up for
  display (e.g. 353 full days against 380 means 27 days short), rather than
  understating a fractional deficit; server calculations are untouched.
  Massi owns the guided Simulator/history; its callbacks/engine remain unchanged.
- **D48 (implemented and browser-checked, 15 Nov):** the approved check-in polish
  groups existing measurements, reuses shared inputs/help/icons and separates
  successful saving from health interpretation. Missing values remain unknown;
  no new symptom semantics, thresholds or questionnaire. Review and saved-state
  copy are FR/EN. See [verification](design/2026-11-15/mission-checkin-clarity.md).

- **D49 (implemented and browser-checked, 15 Nov):** David approves a
  rapid History/Meal clarity pass and a whole-flow checklist for Claude before
  the 18:30 presentation. History must distinguish query loading, empty and
  failed responses, never relabel previous-query values. Meal labels distinguish
  counted packages and catalogue units; existing nutrition rules are preserved.
  PWA/tablet finishing stays deferred. Branch `fix/meal-history-clarity`.

- **D50 (implemented, 15 Nov):** David approves the five pre-demo audit fixes:
  conserve meal deductions when changing only the shelf reference photo; expose
  list errors and retry without erasing prior reports; freeze each Earth message's
  sending mission, leaving unrecorded legacy context explicitly unknown; align
  presentation text with actual protocol/network/demo behaviour. No new feature,
  threshold or migration. Exact commit message and main publication approved.

## Proposed, not decided

| # | Idea | State |
|---|---|---|
| P1 | Compare every vital sign with the astronaut's own 30-day baseline, in addition to the fixed bands ("your heart rate has been rising for five days") | Proposed by Fable. David: interesting if it is quick and useful, otherwise not. Done only for the reaction test so far |
| P2 | Heart rate measured by the camera from the face (remote photoplethysmography) | Proposed by Fable. David: maybe, possibly for Massi. Not started. Sensitive to lighting; the typed value must remain as a fallback |
| P3 | Other self-tests run by the phone (for example a near-vision check for the eyes zone) | Raised by David. Not started. Any such test needs a source and a "screening only" label |
| P4 | Six-dimension wellbeing questionnaire, partial answers and explicitly shared support requests | User brief received 14 Nov; proposed for a later lot, including the decision about existing mood/sleep fields |
| P5 | Injury journal, observations and local photos with comparison and deletion | User brief received 14 Nov; proposed for a later lot |
| P6 | Guided check-in using the existing mood, symptoms and measurement fields, plus coordinated page layouts | Visual prototypes in the [handoff gallery](design/2026-11-14/README.md); final review/error/save states and functional validation still needed; no second wellbeing questionnaire |
| P7 | Shorten the reaction protocol | Resolved by D37: versioned 1 practice + 5 measured; previous sessions retained separately |
| P8 | Optional short, replayable onboarding for jury members opening the crew app | Requested by David; not implemented. Keep it skippable and respect reduced motion |

## Open

| # | Question | Proposal | Who decides |
|---|---|---|---|
| O7 | Should the check-in tell a skipped symptom question from "no symptoms"? Today the request carries a list, so both look the same | Add an explicit "No symptoms today" choice and a field the server stores, with a decision on what a skipped question means | David and Massi |
| O3 | Which machine runs the demo, and which is the spare? | David now has a working local Ollama setup and web previews; choose a primary/spare and rehearse on both. Native apps and Massi's hardware remain unverified | David and Massi |
| O4 | NASA submission: 30-second video or 7 slides? | — | David and Massi |
| O5 | ISS dose rate 0.523 mSv/day has no source; it is now flagged as an assumption in the app | Source it (the CSA radiation resource of the challenge is a lead) or keep it as an assumption | Whoever takes the science task |
| O6 | The sources in `nasa_reference.json` were checked from press releases and abstracts, not from the full papers | Read the primary sources before quoting a figure to the jury | Whoever takes the science task |

## Rules for this file

- Add a line when a decision is made; change its state when the code
  catches up and again when someone has checked it.
- If the code and a decision disagree, say so in [STATUS.md](STATUS.md).
- Never rewrite an old line to hide a change of mind: add a new one that
  replaces it and say which.
