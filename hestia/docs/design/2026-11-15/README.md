# HESTIA — implemented screens and evidence

15 Nov 2026. Captures from Chrome on David's Mac, using a disposable database.
These are running screens, not generated mockups. The mascot within the profile
picker is an AI-generated illustration. No real astronaut records are used.

Scope and unfinished requests: [current register](../../sources/2026-11-15-interactions-and-evidence.md).

## Screens

| Screen | What to inspect |
|---|---|
| [Home, French](home-fr.png) | Reaction test and results above the body; primary check-in action |
| [Reaction start](reaction-start-fr.png) | Practice button visible without scrolling |
| [Desktop profile](station-profile-fr.png) | Full page, selected heart illustration, readings and next step first |
| [Reaction results](reaction-history-fr.png) | Explicit section and zero-based graph; technical copy still needs polishing |
| [Measurement help](help-fr.png) | Contextual sheet; draft kept after closing |
| [Keyboard focus](focus-fr.png) | Single visible outline around the measurement control |
| [Crew board](station-fr.png) | Entry point to full profiles |
| [Profile picker](profile-en.png) | Current mascot illustration, not a finished character system |
| [Saved check-in](saved-fr.png) | Persistent confirmation after successful save |

## Verification and limits

| Check | Result |
|---|---|
| Backend tests, existing Python 3.13 environment | 69 pass earlier in this pass; no backend code changed afterwards |
| Frontend tests | 16 crew + 4 station pass |
| Both TypeScript checks and web builds | Pass; approximately 780 kB JS bundle warning remains |
| Prettier | Pass across frontend sources |
| Oxlint | No errors; 13 React warnings remain; see [lint output](lint.log) |
| Static external-URL scan | No non-local URL found in app sources; this is not a complete runtime offline proof |
| Chrome behavior checks | [14 completed checks](browser-checks.json), no captured JS errors; phone request capture saw no external requests |
| Mobile viewport | 360/390 px; checks cover route overflow, focus, help, reaction shortcuts, failed save and retry |
| Desktop viewport | 1024/1280/1440 px; profile direct URL/reload/back and selected heart checked |
| Reduced motion | Page transition and selected-heart animation disabled |
| Vision API | Real model scan and manual corrections on the disposable database |

The temporary browser harness uses the local Chrome and Playwright installation;
[browser-check.cjs](browser-check.cjs) preserves it for inspection, but its absolute
paths/ports require adaptation on another machine. Screens were visually reviewed,
not merely checked for overflow. This is not a usability study or a complete
accessibility audit. The captures freeze motion and cannot demonstrate the pulse.

Unverified here: actual phone interaction/timing, real camera/shelf/lighting,
Massi's machine, screen reader, native Tauri window, full rehearsal without
internet, scientific or clinical validity. French dynamic text, all-component
migration, tablet design and mascot identity are unfinished.

## Vision evidence

- [Original pipeline output](ollama-vision.json): preserved including the
  original scorer's wrong expected A1=2 value for the empty fixture.
- [Corrected scores](ollama-scored.json): A1=0 after checking the fixture itself.
  Correction improves the reported score; the model itself was not improved.
- [Actual API scan](ollama-api-scan.json) and [persisted manual corrections](ollama-api-corrected.json).
- Reproduction entry point: [verify_vision_fixtures.py](../../../scripts/verify_vision_fixtures.py).
  Its syntax was checked; this newly packaged script was not rerun. The real
  observations above came from the preceding equivalent pipeline/API calls.

Two generated fixtures are not a real-world accuracy estimate. See the register
for all four timings, wrong counts and the unflagged false detection in empty A1.

## Heart follow-up

Explicitly approved targeted revision, 15 Nov. The initial screenshots above
remain as before-state evidence; these are the later views:

- [Desktop detail](heart-detail-fr.png), [full desktop](heart-desktop-fr.png).
- [Mobile sheet](heart-mobile-fr.png), [keyboard focus](heart-keyboard-fr.png).
- [Browser checks](heart-checks.json) and [local verification harness](heart-check.cjs).

The heart is 29 rather than 44 SVG units, filled in fixed flesh/brick pigments,
with small vessels and shading. Its colour does not encode health. The detail
header no longer repeats the icon. Pointer selection brightens the label without
a cyan frame; keyboard focus retains a thin visible outline. Three desktop
readings share a row at 1024/1280/1440 px; mobile retains stacked readings.

Both builds and formatting pass. Chrome verified keyboard activation, pointer
focus treatment, three-column layout, mobile sheet, and reduced motion, without
captured JavaScript errors. The finite 680 ms animation finishes; its keyframes
change only `transform`. Timing/easing and pigments live in shared tokens; no
per-frame JavaScript, new dependency, permanent `will-change` or looping effect
was added. This verifies implementation properties, not FPS/battery use on a
physical phone. The pre-existing 13 lint warnings and bundle warning remain.

This is an illustrative drawing, not medically reviewed anatomy. The background
and other organs were not redesigned. David's visual review is still pending.

## Anatomy, loading and language follow-up

**Current iteration, D26.** Supersedes the earlier finite heartbeat and removed
selection frames. David asked to restore frames/blue selection backgrounds on
all zones; their labels now have 8–10 SVG units of padding. The skin/radiation
arm outline is preserved. Organ pigments do not represent a health level.

| Running screen | Evidence |
|---|---|
| Filled brain | [Desktop](anatomy-brain_morale.png) |
| Two eyes on the face | [Desktop](anatomy-eyes_sans.png) |
| Arm and thigh muscle fibres | [Desktop](anatomy-muscles.png) |
| Continuous illustrative heartbeat, pause available | [Desktop](anatomy-heart.png) |
| One shared spinner | [Pending request](anatomy-loader.png) |
| Failure and retry, distinct from loading | [Error](anatomy-error.png) |
| Structured explanation and threshold boundaries | [Expanded view](anatomy-explanation.png) |
| Plain-language network/data help | [Mobile](anatomy-help-mobile.png) |
| Compact language switch | [Mobile Home](anatomy-home-mobile.png) |

[Completed browser checks](anatomy-checks.json), [local harness](anatomy-check.cjs).
The harness is machine-specific and uses a disposable local API, not a production
test runner. No health records are written in these checks. The mission context
was changed while the preview was in use; these screenshots include that live
context and do not imply that every context was individually validated.

Verified: both web builds, 20 frontend tests, formatting, no captured JS errors;
all eight labels fit inside their frames; keyboard focus; pending/error/retry and
nonexistent-profile states; language persistence in a fresh page and draft
preservation; mobile sheet and 360/390 px overflow. Continuous heart playback
pauses manually, when the SVG leaves the viewport and under reduced motion.
The hidden-tab branch was exercised with a simulated `visibilitychange` signal
because headless tabs do not reliably reproduce foreground/background behavior.
Mobile stops the background heartbeat while its details cover the body.

Animation lives in shared CSS/tokens. Only transforms drive the repeating heart;
brain/eyes/muscles fade once. Visibility uses observers/events, with cleanup and
no per-frame React work. This is not a measured FPS/battery benchmark on a phone.
The rest of the application still needs motion harmonisation; do not describe
all components/animations as finished.

Threshold rows preserve the server's rule order and inclusive/strict bounds.
Known display strings are translated without changing numbers; the latest
weight is labelled as the latest weight, not as the reference weight. These
properties were checked with assertions against the actual threshold config.
No health-engine code or thresholds changed. 13 existing lint warnings and the
approximately 786–788 kB JS bundle warning remain. Full French coverage,
native-phone tests, mascot identity, favicons and the whole component audit
are still open.

## Measurement icons and neutral sheets

**D27, approved detail polish.** The shared sheet has a neutral 1 px outline on
phone and desktop. The measurement family now includes an original neutral face,
stopwatch and symptom notebook, with the existing moon for sleep. Measurement
icons identify labels; status shapes stay beside values and have accessible names.
The body-zone blue selection treatment remains as approved in D26.

- [Mobile, 390 px](measure-icons-mobile-390.png)
- [Mobile, 360 px](measure-icons-mobile-360.png)
- [Desktop brain readings](measure-icons-desktop.png)
- [Desktop heart readings](measure-icons-heart.png)
- [Browser assertions](measure-icons-checks.json)

Both app builds, formatting and diff checks pass. Chrome checked four measurement
icons and four named status symbols, neutral sheet borders at both breakpoints,
no mobile horizontal overflow or column overlap, the compact three-column heart
layout, Escape closing and focus return. No captured JavaScript errors. Existing
13 lint warnings and bundle-size warnings remain (about 791–792 kB JavaScript).
The check reads disposable seeded data without saving health records. Real phone,
screen-reader operation and other application pages were not revalidated here.

## Crew navigation, meals and compact explanations

**D28, latest crew lot.** Approved by David after the icon and context-scroll
corrections. This supersedes earlier Home screenshots, lengthy explanation
layouts and sheet top borders. Full health rules and their order remain available;
the first view is a compact demo reference table, not a medical recommendation.

| Screen | Capture |
|---|---|
| Home: check-in, reaction and results above the body | [Home](crew-lot-home.png) |
| Selected heart visible above its mobile sheet | [Heart](crew-lot-heart.png) |
| Reference table and optional detail | [Explanation](crew-lot-explanation.png) |
| Icons, French dates and origin in History | [History](crew-lot-history.png) |
| Catalogue illustrations and stock provenance | [Meals](crew-lot-meal.png) |
| A confirmed meal | [Receipt](crew-lot-meal-saved.png) |
| Second request deliberately failed; first portion retained | [Partial receipt](crew-lot-partial-meal.png) |

[Browser checks](crew-lot-checks.json), [machine-specific local harness](crew-lot-check.cjs).
Chrome on David's Mac, 360/390 px, 667×375 landscape and station navigation at
1280×800. No captured JavaScript errors. Checks include scroll/focus restoration,
reduced motion, resize when opening explanations, keyboard access to summaries
and units, exact table boundaries, translated labels and no horizontal overflow.
Meal writes were against `/private/tmp/hestia-interaction-review/demo.db`, seeded
members 4 and 3: one confirmed portion changes recorded kcal and expected stock
by the exact amount; double activation emits one POST; failed save/load recover;
a deliberately failed second POST leaves only the first confirmed portion.
The group is still a series of POSTs, not an atomic or idempotent transaction.

Both builds and the 20 existing frontend tests pass. Formatting/offline/diff
checks pass; 13 existing lint warnings and ~794 kB JavaScript bundle warnings
remain. No backend/health-rule change. No physical phone, screen reader,
camera/video, real shelf or Massi-machine verification in this lot.

Light polish review with anti-vibecode / human-brain-ux: concrete actions precede
explanation, one shared icon family, visible labels, no decorative pie chart,
no speculative food-recognition claim. A persistent receipt confirms saved meals;
no transient toast system was added. Favicons, logos, full component audit and
mascot identity remain open. The pressure-monitor image is an explicitly labelled
concept, subsequently integrated under D29, never presented as certified equipment.

### Instrument illustration and final sheet review

David rejected the initial screen crop and redundant expandable second image.
The complete monitor, hose and cuff now appear once at sheet width, with the
matching overlay and existing field explanation. No extra image toggle remains.
[SYS](crew-lot-monitor-sys.png), [DIA](crew-lot-monitor-dia.png),
[PULSE](crew-lot-monitor-pulse.png). Generated/concept attribution is visible.
Chrome checks cover the three fields, 360/390 px mobile and 1280 px desktop:
one complete image, natural aspect ratio, no duplicate toggle or horizontal
overflow, and no browser errors. [Results](crew-lot-monitor-checks.json).
Both builds and formatting pass; 13 existing lint warnings and the JS size
warning remain. No real-phone test. Two initial test selector names were wrong
(measurements action and resting pulse); corrected selectors pass.
The source PNG is unchanged; SVG overlays are local UI elements. Its 1.86 MB
size remains a delivery optimisation opportunity; no real-device performance
claim. [Provenance](../../sources/assets/hestia-pressure-monitor-v1.md).

Final polish checked inline mmHg/ranges at 360/390 px and zero top-border width
for all four entry points: body zone, symptoms, pressure help and general help.
The shared sheet component also covers other help fields. The observer is
disconnected on close and does not run on animation frames.

## Shared component follow-up

D30 keeps the navy/cyan direction and consolidates Button, Panel and input
styling in `packages/ui/src/styles/controls.css`. Mood/symptoms/history now reuse
Button rather than copies of its visual states. This is light component polish,
not a new art direction or a completed migration of every specialised control.

[Check-in](components-checkin.png), [history](components-history.png),
[settings](components-settings.png), [station profile](components-station.png).
[Playwright script](components-check.cjs) and [results](components-checks.json).

Verified in Chrome at 360/390 px with touch emulation and 1280 px desktop:
selection/deselection, keyboard focus, 44 px targets, answers kept across steps,
a mocked failed save with one request under repeated activation, monospaced
station address, reduced motion and no horizontal overflow. The failed save is
intercepted and does not write to the server. Both builds and 20 frontend tests
pass; formatting/offline checks pass. No new dependency. 13 existing lint warnings
and the bundle warning remain. Real phone, screen reader and vision untested.

Claude owns vision in a separate worktree (proposed in his pasted reply;
creation not observed here). UI and integration docs remain Astra's scope here.
Do not share/reset test databases while running the two investigations.

Final CSS rerun: check-in/history passed again; one settings screenshot timed out
waiting for fonts. A targeted retry confirmed Space Grotesk and Plex Mono loaded,
reduced-motion behavior and both settings/station captures. See the `followup`
entry in the results; no Ollama call or real-data write was made.


## Pantry, identity and motion follow-up

D31 is a heavier task-flow pass, following David’s rejection of a layout-only
cleanup. The shelf image is now actionable: click a slot to see that same crop
beside its count, correct it and confirm. The main screen groups capture/counting,
food autonomy and inventory; ration scenarios and movement history are secondary.
Authored photo/cargo icons extend the existing family. Failed confirmation keeps
the draft; a persistent inventory receipt survives filtering out the confirmed slot.

[Before](pantry-before.png) · [After](pantry-final.png) ·
[Photo and count together](pantry-photo-review.png) ·
[Failed save](pantry-save-error.png) · [Photo warning](pantry-vision-warning.png).

[Credits](project-credits.png), [phone credits](credits-phone.png),
[mission illustrations](mission-illustrations.png). HESTIA favicons/install icons
replace the Vite web icons; native Tauri icons remain a separate open item.
ESGI and Space Apps marks are unchanged and local, in the credits; they do not
replace HESTIA. Earth/Moon/Mars/ISS drawings are authored SVG navigation cues,
not NASA imagery or research data.

Sheets enter/exit from the relevant edge, keep modal/focus behaviour and honour
reduced motion. Sidebar selection has a brief docking movement; opening secondary
content and save feedback use shared durations. No new animation dependency,
background loop or claim that every component/page has been polished.

[Playwright checks](pantry-checks.json) and [script](pantry-check.cjs): station at
1024/1280/1440 px, 390 px touch emulation for credits, keyboard focus restoration,
zero mobile sheet top border, no overflow, no double save/scan, failed save draft,
slot crop/form together and translated vision warning. Mutations were intercepted;
this is browser contract testing, not a camera/Ollama accuracy measurement.
An initial check exposed a disappearing receipt when filtering; it is now owned
by the inventory. One close-button selector was corrected to the actual French
label. Final stills were captured with animations fast-forwarded, not mid-fade.

Both builds, 20 frontend tests, formatting, offline source check and diff check
pass. After D32 integration: 76 backend tests pass. 13 pre-existing lint warnings,
large bundles (~804 kB station, ~795 kB crew), and a backend dependency deprecation
remain. Physical phone, actual shelf/camera, screen reader and independent user
comprehension are unverified. No global redesign completion claim.

## Camera, pantry and settings review

**D34–D36 current**, replaces the earlier camera dropdowns, fixed framing and
mission CTA layout. [Full React/UX review, counts and limits](../../sources/2026-11-15-camera-review-and-pantry.md).

| Screen | Current capture |
|---|---|
| Compact station Pantry and active mission | [Pantry](pantry-final.png) |
| Camera photo, movable 2×2 frame | [Framing](camera-frame.png) |
| Products assigned without losing the photo | [Inline attribution](inline-slot-products.png) |
| Crew reserve / photo sources | [Reserve](crew-pantry-reviewed.png), [sources](crew-camera-choices.png) |
| Guide with short topics and mascot | [Guide](onboard-guide.png) |
| Mission/phone settings | [Settings](settings-final.png) |
| Supply-delay comparison | [Scenario](ration-scenario.png) |
| Smaller marks and HESTIA-centred credits | [Credits](credits-refined.png) |

[11 browser checks](flow-review-checks.json), [local harness](flow-review.cjs),
[mission/settings assertions](final-review-captures.cjs). Machine-specific paths;
fake camera and intercepted writes; no accuracy or hardware claim. Screens were
viewed. 88 backend and 22 frontend tests pass, both builds/format/offline pass,
10 existing lint warnings and JS/asset-size warnings remain. Preview PID 15816,
same temporary database. Actual scene-model evidence is linked in the full review.

## Framing, stock setup and product usage

D37–D40: [compact presentation settings](settings-compact.png),
[product usage](products-usage.png), [390px sheet](products-mobile.png),
[frame handles](crop-handles.png), [phone framing](crop-mobile.png),
[cropped review and explicit replacement](crop-review-replace.png),
[waiting companion](analysis-companion.png), [visible rejection](analysis-error-visible.png),
[short reaction introduction](reaction-short-intro.png).

[Capture/setup/reaction checks](crop-setup-checks.json), [script](crop-setup-review.cjs);
[layout/product checks](settings-products-checks.json), [script](settings-products-review.cjs).
Chrome on David's Mac, 1280/1024 and 390px. Writes intercepted, scenarios controlled;
not a model benchmark. The reaction runner really completed 1 + 5 timed signals;
its save was deliberately failed/intercepted. Backend tests separately cover save.

**Known failure:** [station shell at 390px](settings-mobile.png) still has a wide
navigation/header; the sheet fits but the whole admin app does not. This is recorded
in the checks, not hidden by a passing mobile label. Use the crew app on the phone.
92 backend and 23 frontend tests pass; both builds/format/offline pass, 10 lint
warnings and bundle-size warnings remain. No real hardware/phone claim.

## Catalogue, scale and companion motion

D41–D43: [separate package/projected calories](calories-separated.png),
[centred edit form with injected save failure](edit-product-modal.png),
[presentation scale setting](scale-setting.png), [floating companion](companion-floating.png),
[phone station orientation](station-phone-gate.png).

[Five focused browser checks](catalogue-motion-checks.json), [script](catalogue-motion-review.cjs).
Mutations and vision intercepted. Server:92 existing tests +4 new regression tests
pass (package energy vs ×212/×1, input validation, unchanged counts, stale proposals,
duplicate locations with meals, historical recalculation after editing). Both builds
pass; 10 lint warnings and asset/bundle-size warnings remain. Final code also removes
the guide's redundant caption and uses the existing rounded-sheet token on modals.
No physical phone/camera or improved model-accuracy claim.
