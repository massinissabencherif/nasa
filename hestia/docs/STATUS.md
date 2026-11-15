# HESTIA — status

Last update: 15 Nov 2026. This file says what
works, how it was checked, and what is still open. Decisions are in
[decisions.md](decisions.md).

## 15 Nov — Earth link: the wait has content (Massi, branch `feat/earth-link-waiting`)

- Includes David's `fix/earth-link-check` commit (cherry-picked, signed).
- While a report travels, each report card now shows: what Earth reads (the
  values sent) next to what is on board now (latest reading, better/worse);
  an onboard plan ticked by a person with recorded times ("measure again"
  comes due after 1 h of demo clock); the demo rules to act without waiting
  for Earth, reusing the critical bands of `demo_rules.json` (plus "another
  crew member turns red"), with a red banner when one is reached; an update
  the crew can prepare, read and send, with its own delay and reply.
- The simulated reply is built from what Earth received (values, trend,
  procedures, the "do not wait" bands); the fixed "No evacuation indicated"
  reply is gone. Replies stay in English, labelled SIMULATED.
- New table `OnboardStep` (additive). Updates are EarthMessage rows whose
  payload has `kind: "update"`; no column added to existing tables.
- Run on Massi's Mac: 107 backend tests (6 new), station type check and 11
  tests, `make check-offline`; the whole path rehearsed in headless Chrome
  (FR, 1470 px): report, tick, new reading, preview, send, +40 min, reply,
  critical value banner. **Not checked:** the crew phone, the Tauri window,
  keyboard-only use. The rule texts themselves stay in English.

## 15 Nov — combined delivery verification

David approved `feat: clarify mission settings, check-ins and reaction results`
and publication on main. The UI lot is rebased onto Massi's `222076d`; the
Pantry simulator navigation and both agents' status notes are retained.

**Combined checks on David's Mac:** 101 backend tests and 27 frontend tests pass;
both apps build; full Oxlint exits successfully with 10 existing warnings;
merged Pantry formatting, diff checks and offline-source check pass. Large JS
chunks and one Starlette test-client deprecation warning remain. Browser smoke
checks the report API, Pantry → Management simulator → first guided step,
mission settings and rebuilt crew check-in. No health/report test record is
created by the browser smoke check; pytest uses its own temporary database.

The 8011 preview was restarted on `0.0.0.0` with the same existing database,
after a SQLite backup at `/private/tmp/hestia-before-simulator-integration.db`.
It now exposes simulation reports too; no reset. Physical camera/products and
full phone save/meal/photo rehearsal remain unverified. PWA/tablet finishing is
deferred by David to focus on the 18:30 presentation. This delivery does not
include unpublished Earth work; Massi is continuing that scope.

Git is the source for the final commit/publication state; earlier branch and
"uncommitted" statements below are dated snapshots.

## 15 Nov — management simulator (Massi, branch `feat/management-simulator`)

- The What-if simulator becomes the **Management simulator**: five confirmed
  steps (mission and horizon, food and cargo delay, ration, exercise,
  radiation event), each pre-filled from today's mission and stock, then a
  saved report. Reports are frozen (`SimulationReport` table, additive) and
  listed newest first; "Change" on a report reopens the steps and writes a
  new report. The Pantry button now reads "Management simulator" and opens it.
- Fix: `days_without_food` is counted day by day; a second shortage after the
  cargo was reported as 0 (test added).
- Run on Massi's Mac: 101 backend tests, 11 station tests, both type checks,
  `make check-offline`; report created through the API on a throwaway DB.
- UI polish (light, `hestia-ui-polish`): page title, step bar on one line
  with icons, no repeated step title, the needed ration as the key figure,
  numbers in the reader's locale, chart markers translated, chart headlines
  in text type. Rendered with headless Chrome (Playwright) at 1440×900 and
  1024×768, FR and EN: no horizontal overflow, no page error.
- Report findings are now three large counters (critical, caution, nominal),
  worst first; a click opens a modal listing that category. **Disagreement
  with the HESTIA rule** "progressive disclosure is never for a warning":
  Massi chose that red findings also sit behind a click. The red counter is
  coloured, iconed, worded and counted, and the food chart below still shows
  its red badge. David to confirm or revert. Esc closes the modal and focus
  returns to the counter (checked with headless Chrome).
- **Not checked:** keyboard path, screen reader, real Tauri window, phone
  widths (the station sends phones to the crew app). A demo reset drops the
  report history.
## 15 Nov, afternoon — mission context, compact settings and check-in

**Codex delivery: `feat: clarify mission settings, check-ins and reaction results`.**
David approved this exact commit message and publication on main. Integration
retains Massi’s published management simulator (`222076d`), including the Pantry
entry point. Check Git for the resulting commit and publication state.
David approved mission explanations/stable selection, then requested a more compact
layout and an astronaut helmet for Crew. The four mission choices now explain
where the crew lives; Earth round-trip time and supply date precede the scenario
objective. Demo provenance sits below the QR. Pantry shows autonomy and the supply
gap before optional mission explanations; the multiplier remains explicit.

Selecting the already active mission sends no request. Confirmation/error feedback
stays inside the mission card. Sheets enter as opaque surfaces, with existing
slide/exit motion and reduced-motion support. The reported white frame was not
reproduced in Chrome; this does not certify Safari or Tauri rendering.

The already approved check-in pass groups existing measures, adds shared measure
icons and translates the review/result. Saved, attention and missing-data states
are distinct. Payloads, engines, thresholds and reaction protocol are unchanged.

**Checks:** both frontend builds; focused lint (existing icon-file hot-refresh
warnings remain); four check-in flow tests; Chrome phone 320/390, tablet 820,
station 1024/1280. Intercepted mission changes, failure and retry, keyboard focus,
reduced motion and FR/EN check-in paths. At 1280×800 settings have 23px residual
scroll, with mission facts and QR visible. See [evidence and captures](design/2026-11-15/mission-checkin-clarity.md).
No database reset or real test POST; no broad backend rerun for presentation changes.

**Phone access confirmed by David:** current API 8011 was restarted on `0.0.0.0`
with the same temporary database. `http://10.184.21.92:8011/crew/` opens on his
phone; station preview is `http://127.0.0.1:1422/`. The LAN address may change.
The full phone save/meal/photo journey and offline-network rehearsal are still open.
The older 8010 process is separate and was not repaired/restarted in this task.

**Ownership:** David says Massi is working on guided Simulator and simulation
history. Do not edit that scope. Pantry's delay callback remains unchanged.
Claude's Earth-link worktree exists separately; its work is not imported here.

**Next:** real products/camera and end-to-end phone rehearsal; reconcile NASA
submission/pitch with the final features; remaining history/page polish from the
[request register](sources/2026-11-15-interactions-and-evidence.md#next-work-in-order).
David prioritises the local presentation at 18:30; PWA and tablet finishing are
explicitly deferred. Onboarding remains optional. Reliable offline PWA behaviour
is not implemented by this pass.
Existing install icon/standalone manifest is not a tested phone installation.

## 15 Nov, midday — reaction results and zone explanations

**Historical pre-delivery check on `fix/reaction-zone-clarity`.** David approved
this UI-only lot, then requested vertical trial bars and an almost single-screen
result. Reaction results now prioritise the median, counts, a short personal
comparison, the graph and return/restart actions. Detailed interpretation is
optional; the non-diagnostic limit stays visible. Shared views handle complete,
incomplete, empty and reference-building states in FR/EN. Existing long protocols
keep horizontal bars rather than crowding 15 columns onto a phone.

Body explanations separate what sets the colour, the compact demo reference
table, a Guide-style space-context note and optional complete rules. Rule units
sit alongside headings. No engine, threshold, protocol, storage or animation change.

**Checked:** both frontend builds, lint on touched components, formatting and
Chrome at 320/390px for reaction results, 390/820/1180/1440px for zone layouts.
At 390×844 the normal five-trial result and its actions are visible without
scrolling; the main area has 4px of residual scroll. Reference/edge-state checks
use intercepted responses, not new real observations. Seeded status/history reads
use the disposable API database. No backend suite rerun for presentation-only work.
See [screens and verification](design/2026-11-15/result-zone-clarity.md).

Preview: station restarted on IPv4 `http://127.0.0.1:1422/#/earth` at David's
request; API remains on 8011 with the same disposable database. Crew remains
`http://127.0.0.1:8011/crew/`. The previous IPv6-only Vite listener was replaced;
this is a preview-process change, not a source/network deployment change.

**Still open:** physical tablet/phone and shelf rehearsal, check-in form/result
polish, some raw server-error translations, and bundle size (~830/859kB). This is
not a complete tablet certification or a redesign of the check-in form. External
Claude's next task is not confirmed; Earth-link verification is a suggested
independent scope. Do not overlap this branch's shared UI/result files.

**Timing:** David's 18:00 target is internal readiness. An organiser exchange he
pasted says the first local presentation starts at 18:30; the team's own slot,
local presentation language and any local file requirements still need the
organisers' morning instructions. Aim for a stable demo, a hardware rehearsal,
the five-minute pitch, short submission media and reconciled NASA project text
before 18:00. This does not change the separate online submission deadline.

## 15 Nov — shelf photo from a phone (Massi, branch `fix/phone-pantry-photo`)

- Observed by Massi on a real phone: scanning the code under "Photo from a
  phone" opened the crew app at its root, which asks for a crew profile and
  lands on Home; there was no way to the photo, and the in-page camera does
  not start over plain HTTP.
- Now the code opens `/crew/#/pantry?photo=1`: the Pantry, without a
  profile (the shelf photo is a station task), with the photo sheet already
  open. "Take a photo" uses the phone's own camera (`capture="environment"`),
  which works over HTTP; the live viewfinder is offered only in a secure
  context. `/api/station/info` gives `crew_photo_url`; `qr.svg?target=`
  accepts `home` or `pantry_photo`.
- Run on Massi's Mac: backend 102 tests, crew 16 tests, both type checks;
  headless Chrome as an iPhone 13 with no saved profile: the link lands on
  the open sheet and a photo reaches the framing step. **Not checked:** a
  real iPhone and Android on the venue Wi-Fi, HEIC handling by Safari, the
  analysis after a phone photo.

## Current handover — 15 Nov, before David's sleep

David approved consolidating and pushing the night's work onto `main`, with the
exact message `feat: consolidate HESTIA demo flows and team handoff`. This section
travels with the delivery. Check the actual remote commit before starting; earlier
"uncommitted", branch and process statements below are historical snapshots.

- **Open task list, no reserved ownership:** David and Massi can each choose UI
  finishing, hardware rehearsal, Earth link, presentation or another useful task.
  Record the selected scope/branch before starting to avoid simultaneous edits.
- The handover includes the outstanding UI requests, starting with the dense
  reaction result and untranslated personal-reference text. No final UI approval
  is implied; frontend work is not reserved to one contributor.
- **Fable has no assigned implementation task.** The optional message only loads
  current context; choose a concrete subject later. The earlier broad brief was
  withdrawn following David's correction.

The [morning restart](reprise-2026-11-15-fr.md) contains launch instructions,
an open finishing list and a rehearsal checklist. The [optional Fable context message](prompt/2026-11-15-fable-final-readiness-fr.md)
is prepared but unsent; nothing is scheduled.
The full open-request register stays [here](sources/2026-11-15-interactions-and-evidence.md#next-work-in-order).

Only handover documentation changed in this delivery preparation. Earlier test
results below remain dated evidence; no redundant full suite was rerun. Git had
no remote divergence when checked. Actual main publication is established by
Git, not by the presence of these prepared documents. The NASA draft, pitch and
risk table must be reconciled before use; hardware rehearsal is still outstanding.

## Latest clarification and remaining-work register

The Guide → Pantry now discreetly separates today's manual capture from a future
fixed camera taking periodic images; no automatic capture was added. David reports
mostly good results in thorough mode on recent attempts, without a recorded sample
count. Keep that positive feedback distinct from measured reliability.
[Current prioritised remaining-work list](sources/2026-11-15-interactions-and-evidence.md#next-work-in-order)
covers real rehearsal, Massi's proposed Earth-link check, unfinished pages/components,
optional onboarding, deferred features and delivery. No new full test run for this
copy-only change; frontends rebuilt to expose it.

## 15 Nov — latest: catalogue editing, explicit scale and companion motion

**D41–D43 implemented, uncommitted.** Settings → Presentation tools → Prepare
my products → Products & values → Edit opens a centred modal. Name, package kcal
and macros are editable; the form announces recalculation of already logged
meals. In the same settings section, Adjust multiplier offers ×1, demo ×212 or
an integer value; selection alone does not save. Counts remain unchanged.

Pantry shows package kcal separately from the mission projection. Three seeded
bean packages and two water packages are 750 catalogue kcal, or 159000 simulated
kcal at ×212, before later meals. Same-product slots aggregate before subtracting
meals once. Pending photo proposals reject a changed catalogue/scale.

The companion floats during analysis with pause, visibility guards and reduced
motion. Its AI provenance is in credits, without repeated captions. On station
viewports below 768px a clear orientation screen replaces the admin shell and
links to crew. This replaces the previously recorded narrow-screen overflow.

**Verified:** 92 existing backend tests plus four new regression tests pass;
both web builds pass. Five focused Chrome checks cover modal failure/retry,
keyboard containment, multiplier save, calorie separation, animation/pause/reduced
motion and the 390px gate/link. Browser writes/vision were intercepted. Lint has
no errors and 10 existing warnings; formatting/offline checks pass. Larger JS
bundles remain (~852kB station / 824kB crew). Physical hardware and model accuracy
were not retested. [Evidence](design/2026-11-15/README.md#catalogue-scale-and-companion-motion).

**Preview:** API8011 restarted as PID44957, SAME disposable DB; no reset or
actual catalogue/scale mutation by the checks. All latest server changes loaded,
including the previous float-boundary fix. Still localhost-only; real phone/LAN
needs rehearsal. Reload crew for rebuilt assets. No commit/push/publication.
Remaining vision, Massi Earth-link rehearsal, jury onboarding and submission work
stay open; older entries below are historical.

## 15 Nov — latest: framing, stock preparation and short reaction test

**D37–D40 implemented, uncommitted.** Product preparation and confirmed stock-only
emptying are in Settings → Presentation tools. The short preparation panel and
Earth clock stack beside scenarios. Unused products and multiple slot assignments
are explicit; repeated products are allowed. No quantities were reset automatically.
Review distinguishes a partial update from the whole new reserve (zero unseen
slots only after saving). Frame sides/corners resize, centre moves, previews crop
to selected boxes. Rejections are focused near Analyse; waiting uses the existing
mascot. Current reaction protocol is 1 practice + 5 measured, with old history kept
separate. [Current review](sources/2026-11-15-camera-review-and-pantry.md#latest-follow-up--d37d40).

**Verified:** 92 backend / 23 frontend tests, both builds, format/offline/diff checks.
No lint errors; 10 existing warnings. Nine additional recorded browser checks,
including keyboard, reduced motion, review scope, stock-only reset confirmation
and a real-timed five-trial run; writes intercepted. [Evidence](design/2026-11-15/README.md#framing-stock-setup-and-product-usage).

**Limits:** shared sheets fit 390px, but the station header/navigation still
overflow at phone width. New-user comprehension, screen reader, actual camera,
physical phone/LAN and Massi's machine are unverified. Qwen still miscounts:
David showed 1 rice bag predicted where 3 were visible; no new accuracy benchmark.
Liaison Terre backend scenario passes, full UI rehearsal proposed for Massi.
Jury onboarding, broader copy/components, video and submission remain open.

**Preview:** station1422 and crew/API8011, API PID30751, unchanged disposable
`/private/tmp/hestia-interaction-review/demo.db`, localhost only. Frontends rebuilt;
reload crew. The final tiny crop-boundary float tolerance is tested in source and
will load at the next API restart; other changes are already in this API process.
No real DB reset, commit, push, merge, publication or Xcode installation.
Older entries below describe earlier snapshots.

## 15 Nov — latest: camera, safe stock review and clearer controls

**D34–D36 implemented and browser-checked, uncommitted.** Both apps share camera
preview/capture, per-photo 1–3 × 1–4 framing, and review before saving live counts.
Station product assignment stays with the photo. Changing a slot's product makes
its quantity unknown until recounted. Partial frames preserve unseen stock/meals;
changing the grid does not reassign products or clear the remaining demo stock.
The model counts known assigned products; it does not freely recognise food or
infer nutrition. [Current report and checklist](sources/2026-11-15-camera-review-and-pantry.md).

Pantry is compact, with physical counts first and full-width actions for the
active mission and a supply delay. Mission illustration is in the header.
Settings separates mission/phones, presentation controls and local AI. Guide
uses topics/short steps with the existing mascot. Technical calibration remains
for custom catalogue/capacity settings; it is not redesigned.

**Verified:** 88 backend tests, 22 frontend tests, both builds, Prettier,
offline source scan and whitespace checks pass. Oxlint has no errors and 10
existing warnings. Playwright checks fake camera capture/cleanup/denial, frame
keyboard controls, inline assignment/photo preservation, review-before-save,
focus wrapping, reduced motion and mobile/desktop overflow; no JS errors.
[Current screens](design/2026-11-15/README.md#camera-pantry-and-settings-review).

**Actual Ollama:** scene guard rejected the user's logo, accepted the existing
synthetic shelf; a separate HTTP logo scan returned 400 with stock unchanged.
This is not a count-accuracy benchmark. Claude's 24/24 still concerns two tuning
images. New photos, camera hardware, phone/LAN, video and Massi's machine remain
unverified. Model training was discussed, not performed or validated.

**Preview:** station `http://127.0.0.1:1422/#/pantry`; crew
`http://127.0.0.1:8011/crew/`. API PID 15816 retains the same disposable DB at
`/private/tmp/hestia-interaction-review/demo.db`. It binds localhost only: the QR
port is correct but this preview is not accessible to a separate phone yet.
Other servers/real data were not reset. Reload crew to load the rebuilt app.

**Next:** actual products and repeated photos first, then video with Claude;
optional jury onboarding is requested but not implemented. Broader page/component,
translation/graph/mascot/performance work and submission remain open in the
[request register](sources/2026-11-15-interactions-and-evidence.md). No commit,
push, merge, publication or Xcode installation. Older entries below are historical.

## 15 Nov — current work: interactions, discoverability and evidence

**Latest (D31–D33):** station Pantry now opens a photographed slot beside its
count for review, separates capture/inventory/autonomy from test tools/scenarios,
and uses the shared icons and motion. Credits, ESGI/Space Apps marks, web favicon
and install icons are present; small planet/habitat illustrations identify missions.
Shared sheets have entry/exit motion and reduced-motion support. This is not a
finished redesign of every screen. [Screens/checks](design/2026-11-15/README.md#pantry-identity-and-motion-follow-up).

**Claude/Fable vision imported with David's approval:** worktree exists at
`../hestia-vision-worktree`, branch `fix/vision-reliability`, reviewed at `34c8962`.
Source/test changes and evidence are now applied here, uncommitted, without a
branch merge. Station Pantry offers cross-checking and displays photo warnings;
crew Pantry still offers its older full/row choice. 76 backend tests, 20 frontend
tests, both builds, formatting/offline checks and focused browser checks pass.
13 lint warnings and bundle/dependency warnings remain. The 24/24 count result
belongs to Claude's two tuning fixtures; no fresh real-world accuracy result.
Preview API on 8011 was restarted with the SAME disposable DB, PID 75038; other
servers and real data were untouched. Reload the browser for the built crew app.

**New image:** a cleaner [synthetic shelf candidate](sources/assets/shelf-demo-v2-candidate.md)
is saved for review, not installed as a new fixture. A real demonstration should
use a calibrated 3×4 layout with known products, not a mixed random bin. Its
current 212-ration-per-box scale is a demo assumption and must be explained.

**Submission reminder:** Sunday 15 Nov 2026, 23:59 local time. The online demo
can be a video under 30 seconds OR up to 7 slides; the local 5-min talk/4-min Q&A
is a separate format. [Official answer](https://github.com/nasa/spaceapps/discussions/1991).
The NASA-page draft still needs reconciliation with current behaviour (network,
optional reaction test, removed home badges and actual vision limits) before use.
Nothing has been submitted or published.

**Parallel work confirmed by David:** Astra owns `packages/ui/` and the web
interfaces in this checkout. Claude owns the Ollama/photo/video investigation;
his separate Git worktree is now verified; D32 imports the reviewed snapshot. Use
separate disposable databases/ports and no branch switching or reset in this
checkout. Claude reads the current brief here: a worktree created from HEAD
does not include these uncommitted UI changes or new handoff files. Each agent
keeps evidence in its own checkout; reconcile shared documentation at integration.

**Component follow-up (D30):** Button and Panel variants/states now live in
shared CSS, including touch height, focus, busy/disabled and reduced motion.
Mood, symptoms and history use Button rather than copies of its styling.
Panel headers tolerate wrapping; connection settings reuses the shared input.
Custom button classes no longer replace the base class, busy actions keep focus
but reject further activation, and default buttons cannot submit a form by accident.
This is a foundation pass, not completion of every page or the design system.
20 frontend tests, both builds and focused Playwright checks pass; 13 existing
lint warnings remain. No real-phone, camera or Ollama test in this pass.
[Screens and checks](design/2026-11-15/README.md#shared-component-follow-up).

**Instrument help (D29):** David approved the generated monitor illustration.
After David's visual review, the field help shows the complete monitor and cuff
once, at the width of the sheet, with a SYS, DIA or PULSE overlay and a plain-language
instruction. The cropped preview and duplicate expandable view were removed;
the generated/concept caption remains. The PNG is bundled
locally and requested when this help mounts, not used as live health data.
Checked in Chrome at 360/390 and 1280 px, on all three fields; both builds and
formatting pass. No real-phone test; existing lint/bundle warnings remain.

**Latest crew lot (D28):** HESTIA links home, settings uses a cog, the selected
body area is framed above mobile details with scroll/focus restored on close.
Home has one compact check-in/reaction/results block; its duplicate card and
routine/badge accordions are removed. History uses measure icons and translated
labels/dates/origins. Meals use ten authored food pictograms, translated catalogue
names, explicit demo portions/stock provenance and a persistent save receipt.
Zone explanations start with a short reference table, units inline with values,
touch/keyboard unit help and optional complete rules. All bottom sheets use the
same style without a top border; desktop side sheets keep their neutral outline.
Credits name David Meguira and Massinissa Bencherif; logos were added later in D31.
[Current gallery and checks](design/2026-11-15/README.md#crew-navigation-meals-and-compact-explanations).
Ollama's count-to-inventory-to-meal chain is explicitly in the Claude/Fable handoff;
free recognition of unknown foods is a separate proposal, not implemented.

**Latest detail polish (D27):** shared sheets now have a neutral 1 px border,
without the cyan top/side accent. Authored mood, stopwatch and symptom-notebook
icons join the existing moon and measurement family. Measure icons precede
labels; named status symbols sit beside values. Both builds pass; Chrome checks
cover desktop and 360/390 px mobile, long values, heart layout, Escape and focus
return. [Screens and checks](design/2026-11-15/README.md#measurement-icons-and-neutral-sheets).
13 existing lint warnings and the roughly 791–792 kB JS bundle warning remain.
No phone hardware test or complete component/design-system audit is implied.

**Latest follow-up (D26, supersedes the initial heart treatment below):** single
spinner with explicit load failures/retry, filled brain, eyes on the pupils,
muscle fibres on arms/thighs, compact persisted language button, clearer FAQ and
zone explanations. David restored selection frames/backgrounds on all zones;
labels now have an 8–10 unit inset so the final letters stay inside the frame.
The heart now repeats while selected/visible, with pause/resume, reduced-motion
support and visibility guards. Other new anatomy fades in without bouncing.
The profile heading spacing is tighter. No mascot added to fill empty space.

Both builds and 20 frontend tests pass. Browser checks cover loading/error/retry,
missing profiles, language/draft persistence, focus, label padding and motion
visibility; see [latest evidence](design/2026-11-15/README.md#anatomy-loading-and-language-follow-up).
13 pre-existing lint warnings remain; no new dependency. Real-phone performance
and hardware remain unverified. [Fable's proposed vision follow-up](prompt/2026-11-15-fable-vision-followup-fr.md)
is a local draft, not sent. Ollama accuracy has not improved in this UI pass.

Astra on `fix/mobile-interactions`, based on Fable's local `style/character`
at `0fb3cd3`. All prior seven Fable commits exist locally; older “not committed”
statements below describe their historical state. This pass is uncommitted.
No push, merge or external publication authorised/performed in this pass.

The [request register and review](sources/2026-11-15-interactions-and-evidence.md)
is the current complete list, including unfinished items. Shared inputs/help,
EN/FR switch, full desktop profiles, reaction shortcuts/results, focus and
selected-zone motion are implemented. Prettier now formats frontend sources;
Oxlint covers both apps and shared packages, with warnings still open.
Ollama is installed and real scans plus manual correction work through the API,
but counting is imperfect. Sources are references, not real crew measurements.

69 backend and 20 frontend tests pass; both web builds pass. Browser evidence
and remaining limits are in the [implementation gallery](design/2026-11-15/README.md).
No real phone, shelf/camera, Massi-machine or clinical validation. French dynamic
messages, full component migration, mascot identity, Python lint/CI, broader
onboarding and final art/motion direction are unfinished. No new wellbeing or
injury-journal feature. Continue from this register rather than old prompts.

**Initial heart follow-up, superseded by D26 above:** smaller filled
brick/flesh illustration, no duplicate panel icon or cyan pointer-selection
frame, keyboard-only focus cue, three desktop readings in one row. Motion is
in shared CSS/tokens: one 680 ms transform sequence, stopped after completion,
disabled with reduced motion. [Screens and checks](design/2026-11-15/README.md#heart-follow-up).
Other organ drawings and the background were left as they were. Visual approval
of the new heart remains with David before extending the treatment. The next
requested pass concerns unfinished components/icons/copy/charts/French, then
useful mascot behavior/help/motion; it has not been implemented by this follow-up.

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

**Lots 2 and 3 done later on 14 Nov by Fable (D19), branch `style/health-flow`.**
The check-in is three steps with a review; Home has a clear primary action;
the interrupted reaction test and its back button are explicit; History states
the newest value, date and origin; Meal separates estimate from logged; the
station crew board distinguishes today, no check-in today, too old and no
data. Checks run: 69 backend tests, 16 crew and 4 station frontend tests
(Node 22.22.2; Node 20 cannot run them), both type checks and builds,
`make check-offline`. Browser run at 390×844 against a throwaway database:
step 1 to 3, back without losing 64 bpm and 0 min, a deliberately failed save
that kept the answers and an error message, then a successful save. Station
board at 1280×800 with one stale, one yesterday, one red and one current
astronaut.

**Character pass, same day (D20), branch `style/character`:** Home built
around "Today's routine" with a colour legend; HESTIA mark; an icon per body
zone; instrument icons on the station crew board; nominal zones quieter.
Checked: 20 frontend tests, both builds, screenshots of Home, a zone panel,
the station crew board and the Earth link. Not checked on a phone.

**Depth and ink, same day:** the opened detail is the only lifted surface
(`Panel elevated`); the station scrolls it into view (checked: its title is
visible after opening a card at 1280×800); error and status text outside the
shared components uses the ink colours. Station build copy pointed at my own
server for these checks.

**Honest note about that run:** a preview server started earlier by someone
else (Python, port 8000, a temporary database) was already listening, so the
first browser checks of lots 1 and 2 ran against it, not against a server of
mine. No server code changed in these lots, so their behaviour is the same,
but a few demo scenarios were triggered on that temporary database. The
station checks of lot 3 used my own server on port 8010 and a copy of the
station build pointed at it.

**Still not implemented:** the light harmonisation of lot 4 (profile,
settings, calibration, simulator), a redesign of the pantry screens, and the
alerts and Earth screens beyond their corrected texts. No screen was checked
on a physical phone, with a screen reader or by a new user.
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

Historical baseline from the earlier passes. For the current scan timings,
tool availability and remaining work, use the 15 Nov register at the top of
this file. In particular, Ollama is now installed on David's Mac and the NASA
project-page draft has links, but submission placeholders remain.

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
