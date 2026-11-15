# HESTIA — interaction pass and evidence register

15 Nov 2026, continuation of 14 Nov. Owner: Astra. Branch:
`fix/mobile-interactions`, based on Fable's local `style/character` at
`0fb3cd3`. No commit, push or external publication in this pass.
This is the current request register; earlier mockups are not delivery evidence.

**D41–D43 current:** editable catalogue in centred modals; an explicit mission
multiplier in presentation settings; unscaled package kcal separate from projected
kcal; companion float/pause with credits consolidated; a narrow-screen station
orientation to crew replaces the overflow. Four new backend regression tests and
five focused browser checks pass. See [the gallery](../design/2026-11-15/README.md#catalogue-scale-and-companion-motion).
The scale persists until changed/reset, and edit consequences for old meals are
announced. No actual stock reset, product edit or scale change during browser checks.

**D37–D40 historical:** stock setup/emptying in presentation settings; product usage
and non-blocking multi-slot cautions; compact settings columns; cropped preview,
edge handles, visible errors and mascot waiting; versioned 1 practice + 5 measured.
92 backend / 23 frontend tests and both builds pass. Shared sheets fit mobile;
station shell at 390px does not. No real camera/phone or new vision accuracy claim.
Earth UI rehearsal proposed for Massi; no external assignment message sent.
[Latest report](2026-11-15-camera-review-and-pantry.md#latest-follow-up--d37d40).

**D34–D36 historical:** [camera/pantry/Settings and React/UX checklist](2026-11-15-camera-review-and-pantry.md).
Both apps share capture/framing/review. Counts need human acceptance. Inline
product assignment preserves the photo; changing dimensions preserves labels and
unseen stock. Compact active-mission actions, header illustration, Settings groups
and topic-based mascot guide are implemented. 88 backend / 22 frontend tests and
both builds pass; 10 lint warnings remain. Real logo rejection checked, new-food
count accuracy and hardware still unverified. Jury onboarding is still pending.

**D31–D33 historical:** [station Pantry/credits/motion screenshots and checks](../design/2026-11-15/README.md#pantry-identity-and-motion-follow-up).
The photo now opens the corresponding count for verification; components retain
keyboard/reduced-motion behaviour. Web icons, school/event credits and mission
illustrations are present. Claude's cross-check mode is integrated in station
Pantry with photo warnings; its two tuning-image results do not validate real use.
[New synthetic shelf candidate](assets/shelf-demo-v2-candidate.md): preview only.

UX basis: David could not identify what the Pantry actions produced; a layout-only
pass did not solve it. [Recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/)
(expert guidance) supports keeping the evidence beside the decision. Our concrete
inference is to open the actual slot image next to its count and name each action.
Tradeoff: per-slot detail requires opening a sheet; bulk inventory remains visible.
A browser test verifies mechanics, not comprehension by astronauts or new users.
Uiverse's loader gallery was consulted for inspiration; no snippet was copied.

**D30:** shared Button/Panel CSS replaces duplicated component styling; mood,
symptoms and history share Button states, including touch height and keyboard
feedback. Remaining page-specific controls, tablet layouts, broad translation
and art direction remain open. Claude is assigned vision; Astra owns UI.

Latest update: **D28** groups Home navigation, history/food icons and translations,
meal receipts, contextual scrolling and compact reference tables. All bottom
sheets lose their top border; complete colour rules remain reachable.
[Crew lot and checks](../design/2026-11-15/README.md#crew-navigation-meals-and-compact-explanations).
The pressure-monitor illustration is now integrated after explicit approval
(D29): one complete device illustration at sheet width, per-field SYS/DIA/PULSE
overlay and visible AI-generated/concept attribution. David rejected the initial
screen crop and duplicate expandable view. No medical reading is produced.

**D27** removes the sheet's decorative cyan edge and adds shared
measurement pictograms, with named health status symbols beside values.
[Desktop/mobile checks](../design/2026-11-15/README.md#measurement-icons-and-neutral-sheets)
pass; whole-app component/icon migration remains open.

**D26** supersedes the early selection/motion treatment in this
report. Selection frames/backgrounds are restored everywhere at David's request,
with more label padding. Brain/eyes/muscles now have filled anatomical cues;
heart playback is continuous with pause and visibility guards. Skeletons are
gone, request failure is explicit, language is compact/persisted, and FAQ/zone
explanations are structured. [Current captures and limits](../design/2026-11-15/README.md#anatomy-loading-and-language-follow-up).

## Product and device roles

The [official challenge](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/)
was reread from its HTML payload. Its core is visual self-assessment and
understandable next steps. It allows different inputs, suggests interactive
body zones and animations, and makes periodic prompts and gamification optional.
It does not mandate a phone, daily measurement of every indicator, a mascot,
a dashboard or a NASA live-health feed.

Our chosen story: an astronaut records available readings and how they feel,
reviews the result, understands changes and can request support. Daily check-in
is our product routine, not a NASA medical protocol. The personal experience
is the main task; the station board supports crew coordination. Phone/tablet
use is a proposal for a personal terminal, not a claim about actual flight hardware.
The personal app is still capped at 480 px, so a full tablet/desktop adaptation
remains open. The station app has its own desktop layout.

Local means processing on the station computer. A phone still needs the local
network to reach it; internet is unnecessary. A single computer can run both
interfaces and the server without Wi-Fi. Only reaction sessions have a local
pending-sync queue; ordinary check-ins are not independently usable offline.
Labels now say local server/station. The Earth link and replies are simulated.

## Every request, with its real state

| Request | State now | What remains |
|---|---|---|
| Inputs, units and native arrows | Shared Input/Select/MeasurementInput; numeric arrows removed, mobile numeric keyboard kept | Legacy inline styling and some raw controls remain; not a complete component migration |
| Buttons, cards, focus | Shared pressed/loading/focus states; one input outline; SVG focus represented by its own highlight | Audit every control with assistive technology and real touch |
| Profile desktop | Full route, browser Back and direct link; body and detail side by side | Tablet layout, loading/error recovery and user testing |
| Reaction/history discoverability | Home shortcuts, direct results page, station profile section links; check-in launch no longer hidden in an accordion | Validate on physical phones and under longer translations |
| Wording and graphs | Zone readings/action first; explanatory content expandable; reaction graph starts at zero with ms axis | Many dynamic/server strings remain English, and wider wording/graph review is unfinished |
| Custom icons and body motion | Existing instrument family, improved glucose mark, new selected-zone anatomy illustrations; continuous selected/visible heart with pause | Anatomical drawings are illustrative, not medically reviewed; pressure icon remains weak |
| Background/depth | Subtle static surface light and lifted detail | No final art direction approval; no animated space backdrop |
| Mascot | Generated illustration on profile picker and guide access; help has short topic-based content | No final name, personality or pose system; no decorative filler |
| Help, tooltips, FAQ | Contextual field help; keyboard/touch tooltip + sheet; common FAQ explains local network, simulated data, scans and reaction test | No complete onboarding journey; no automatic tour |
| Toasts | Existing persistent confirmations/errors retained | No shared toast component added; add only for a concrete action needing transient feedback |
| Micro/page animations | Shared sheet entry/exit, sidebar docking, open/save feedback, existing page/step and anatomy motion; reduced motion | No complete motion audit; no complex page choreography |
| Prettier/lint | Prettier pinned and applied to frontend sources; Oxlint covers both apps/shared packages | React lint warnings remain; no Python formatter/linter or CI gate added |
| Ollama | Installed; Qwen2.5-VL 7B runs locally; real pipeline and API scans and corrections exercised | Real shelf/camera, lighting, phone and Massi's machine unverified; model still miscounts |
| NASA data and scientific reliability | Published Mars reference and NASA standard checked on primary pages; source help in app | No astronaut clinical dataset or live sensor ingestion; no clinical validation |
| Shared agent memory/docs | This register linked from STATUS/index/decisions | No plugin sync or new skill installed; do not infer these are done |
| Wellbeing questionnaire and injury journal | Still proposals P4/P5; existing mood/sleep kept | No second questionnaire, photo storage or injury tracking implemented |
| Protocol length | D37: 1 practice + 5 measured, reaction-5-v1 | Old 15-trial records retained, comparisons separate; physical timing/clinical validity not established |
| Final delivery | Existing project-page and five-minute pitch drafts | Fill submission placeholders, choose/produce the video or slides, declare all AI assets/tools, rehearse 5 min + about 4 min questions; no publication or merge in this pass |
| Presentation data buttons | Already exist under station settings: low exercise, red alert, shelf removal and reset | Audit and rehearse these controls; do not build a second generator or reset real records |

The [initial vision investigation](../prompt/2026-11-15-fable-vision-followup-fr.md)
has now been performed by Claude/Fable and imported under D32. Its latest `cross`
result is 12/12 on each of the TWO tuning images; older full/row results below
remain historical evidence. No independent photo or actual camera/video test
has established reliability. See [the full imported report](2026-11-15-vision-cross-check.md).
The broader component, graph, mascot identity and complete localization work
remain open. New anatomy/motion is integrated into shared components/styles;
the rest of the app does not yet have a fully harmonised motion system.

## Next work, in order

Current triage after D43 (15 Nov). David reports that thorough reading is mostly
correct in his recent attempts. This is positive user feedback, with no exact
sample size/count log; do not convert it into an accuracy percentage. Keep the
observed rice failure and the old two-fixture benchmark alongside this feedback.
The Guide's Pantry topic now discreetly describes a fixed-camera/periodic-image
future. Manual capture + human review is the current behaviour; no scheduler added.

| Priority | Remaining task | Proposed owner / completion evidence |
|---|---|---|
| Before demo | Actual purchased products, labels/values, grid, ×1 vs demo scale; repeated photos, one removal, manual correction | David + Massi; record actual counts/time and a fallback; Claude on vision if failures |
| Before demo | Whole Mac + real-phone local-network journey, QR, camera permissions, save/meal/stock consistency, network without Internet | Opening over LAN confirmed by David on 15 Nov; API 8011 now binds 0.0.0.0. Full save/meal/photo and Internet-off rehearsal still open |
| Before demo | Liaison Terre screen and scenario: trigger alert, queued/delivered/replied, explain accelerated clock | Separate Claude Earth-link worktree exists; actual team rehearsal still outstanding. David assigns guided Simulator/history to Massi |
| Before demo | Reconcile NASA-page/pitch with actual features, sources, editable scale, 1+5 reaction, local-network limits; choose final demo media; timed 5min + about4min Q&A | Team; existing submission draft contains stale claims and placeholders; no submission performed |
| Finish experience | Simulateur/Liaison Terre hierarchy and explanations; legacy calibration; remaining astronaut screens/copy/graphs and translated server messages | Decide from David's next reviews; no claim of whole-app UI completion |
| Quality | Remaining raw controls/shared-component migration, complete keyboard/touch/motion review,10 lint warnings, JS/image size, Python checks/CI | Select high-impact items; no need to repeat checks already passed absent changes |
| Useful if time | Short optional/skippable jury onboarding; mascot identity/name/useful poses; targeted icons/illustrations or feedback | Not a requirement to add decoration or a toast everywhere |
| Future scope | Periodic camera capture/change detection/video; freely recognising new foods/model adaptation; wellbeing questionnaire, injury-photo journal | Not implemented; no training/reliability claim or new feature commitment |
| Delivery | Final shared handoff, approved commit message, then explicitly approved push/merge/publication; Massi can reproduce final version | Uncommitted work is not yet a shared release |

Already present: web favicon/install icons, ESGI/Space Apps credits and both names,
shared form/button/sheet foundations, centred product modals, selected-body motion,
help/source references, five-trial reaction, product setup/editing and scale control.
Do not put these back in the “not started” list. Native app icons, full tablet layouts,
shared-plugin alignment and complete design-system audit are not finished.


**Follow-ups D26–D30 are complete within their recorded scope:** anatomy,
load/error states, compact language/help, crew navigation/meals and shared control
foundations. The heart repeats only while selected/visible, with pause and reduced
motion. Do not redo the superseded finite-heart or cropped-monitor treatments.
The wider page, component, copy and mascot work below remains open.

1. **Demonstration reliability:** run one whole scenario on the chosen Mac and
   real phone; disconnect internet while keeping the local network; try the
   actual shelf, camera permissions and manual correction. Confirm the demo
   threshold decisions with David and Massi. Make no clinical reliability claim.
2. **Finish the existing experience:** missing/error recovery on desktop
   profiles, unfinished French messages and reaction-result copy, remaining raw
   controls and weak icons, tablet layout, keyboard/touch checks. Remove the 10
   remaining React lint warnings; consider bundle and mascot-image size (about 780 kB JS
   and 1.27 MB PNG), then Python checks and an automated verification gate.
3. **Character with a purpose:** approve the mascot role and a small set of
   useful poses, refine depth and coherent motion. Onboarding or toasts only
   where an observed task requires them. No new feature merely to add spectacle.
4. **Delivery:** finish sources/assumptions and submission text, run the timed
   presentation, review and approve commit messages, then explicitly approve
   publication. Keep wellbeing/injury features deferred unless scope is reopened.

This is a review order, not a promise that every open item is required for the
hackathon. The existing application is a prototype; no final “production-ready”
or complete design-system claim is made.

## UX review: evidence, decision, trade-off

Applied `anti-vibecode` and `human-brain-ux`, with the project's corresponding
skills. This is an expert review and browser verification, not a usability study.

- Observed: a full profile was squeezed into a side sheet; details/history fell
  below the body. Decision: a navigable full profile with separate reaction
  results. Trade-off: one navigation step back to the crew board.
- Observed: measurement explanations and legacy protocol language preceded
  the usable reading/action. Decision: readings and next step first; optional
  context behind an explicitly labelled disclosure. Essential stale/no-data
  messages remain visible.
- Observed: double focus effects and native number spinners disrupted the
  instrument language. Decision: one keyboard outline, explicit units, labelled
  native inputs, a custom visible SVG focus state.
- Observed: the reaction entry could be below the fold or covered by the
  check-in footer. Decision: small Home shortcuts and a direct launch button;
  opening the test resets scroll position. Reaction remains optional.
- Visual treatment: original navy/cyan, Space Grotesk, quiet surfaces; body and
  selected-zone illustration are the memorable elements. Motion communicates
  selection/state and is disabled for reduced motion. It never drives timing.

References: [W3C modal keyboard/focus pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
(normative interaction guidance) and [NN/g modal trade-offs](https://www.nngroup.com/articles/modal-nonmodal-dialog/)
(expert practice). Neither proves HESTIA's usability or suitability in space.

## Ollama: measured, with a corrected scoring mistake

Ollama 0.40.15, `qwen2.5vl:7b`, digest prefix `5ced39dfa4ba`, about 6 GB,
on David's Mac. Loopback server with cloud disabled; no automatic service
installed. Model download completed. Homebrew also installed dependencies;
the project tests continue to use its Python 3.13 virtual environment.

| Fixture | Strategy | Time | Exact slots |
|---|---|---|---|
| Full | Whole image | 21.52 s | 11/12 |
| A1 empty | Whole image | 13.55 s | 10/12 |
| Full | Three row crops | 33.02 s | 11/12 |
| A1 empty | Three row crops | 14.08 s | 11/12 |

These are four individual runs on two generated fixtures, not a robust accuracy
estimate. Cache/warm-up state was not controlled; do not quote as live-camera
latency. A3 contains four stacked cans but is read as two in every run.
The whole-image run invents one can in empty A1, without triggering confirmation.
The three-pass run reads empty A1 correctly.

**Correction:** Astra's initial temporary scoring script expected A1=2 for the
removal fixture. Visual inspection confirms A1=0, matching the earlier benchmark.
Corrected scores are above; original raw outputs are preserved alongside corrected
scores in the evidence folder. This changes the three-pass removal score from
10/12 to 11/12. The model was not improved or retrained in this pass.

A further real `POST /api/pantry/scan?mode=image` call on a throwaway database
returned in 21.0 s. Human corrections A1→0 and A3→4 were persisted with source
`manual`; estimated autonomy changed 398.0→393.4→398.7 days. This verifies the
API→model→database→correction path, not a physical camera. UI counts without
human confirmation no longer claim “OK” or use a green check as proof.
A high plausibility score is not an accuracy probability. All counts need review.

## What reliability means for the demonstration

Three separate claims need three kinds of evidence:

1. Software behavior: repeatable tests, failed-save recovery, source/date labels,
   no-data/stale states, actual local API and model calls.
2. Scientific traceability: reference → units/context → team assumption → output;
   a published environmental rate is not a personal clinical measurement.
3. Operational suitability: camera, network, phone, a new user and a timed rehearsal.
   These remain unverified; automated test counts do not substitute for them.

[Checks and screenshots](../design/2026-11-15/README.md) distinguish completed
checks from the remaining work. A jury demonstration should show one reading,
its explanation and provenance, then one deliberately wrong scan corrected by
hand. This is a proposed proof sequence, not a claim of likely awards.

## Mascot direction — proposal only

Keep the existing shell/dome silhouette and cyan face. A possible identity is
an observant station caretaker: precise, discreet, slightly curious, with a
small toolbox gesture. Three useful poses: welcome, pointing at an explanation,
and confirming a completed task. No health score, diagnosis, guilt or rewards
for a “good” reading. No name chosen; do not copy a famous character. Keep this
out of the critical health flow until its purpose is demonstrated.
