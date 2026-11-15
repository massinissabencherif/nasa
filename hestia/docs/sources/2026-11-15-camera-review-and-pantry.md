# Camera, pantry and interaction review — 15 Nov

Owner: Astra, `fix/mobile-interactions`, uncommitted. David approved this lot
and steered the active-mission, density, framing and guide changes. This report
supersedes D31–D33's UI/automatic scan descriptions, not their historical results.

## Latest follow-up — D41–D43

David approved catalogue editing, adjustable demo scale, companion motion and a
phone orientation screen. These supersede the narrow station overflow and repeated
companion attribution recorded below. Existing product values are demo estimates,
not labels verified for tomorrow's products. Three bean cans ×250 kcal + water0
=750 package kcal; ×212 makes159000 projected kcal. Both are now labelled separately.
No claim that the model measures nutrients.

The centred form edits name/kcal/macros and announces recalculation of old meals.
The multiplier is saved explicitly, with ×1/default/custom presets. Counts stay the
same; available demo meal portions and projections change. Same-food stock in several
slots now aggregates before meals are deducted, avoiding repeated/partial deductions.
Catalogue/scale changes reject an older staged photo. Full reset restores demo defaults.

96 backend tests pass (92 existing plus4 targeted regressions), both builds pass;
no additional full browser/reaction run after the five focused checks passed.
[Checks](../design/2026-11-15/catalogue-motion-checks.json) use API write stubs and a
controlled 3-bean/2-water fixture; they are not accuracy measurements. They check
modal positioning, failed save/retry, nested keyboard focus, explicit scale save,
separate calories, moving/paused/reduced-motion companion, and 390px gate/crew link.
The form-failure screenshot intentionally shows the injected test error.

Animation transforms stay in shared CSS tokens; visibility/page/reduced-motion
handling reuses the existing hook. AI image provenance is in project credits,
not repeated beside the mascot. The station gate applies below768px, not a phone
hardware check or authentication. True LAN/camera and vision/video still unverified.

## Latest follow-up — D37–D40

Current: one practice + five measured trials, explicit stock setup in Settings,
eight frame handles, cropped previews, mascot waiting state, visible/focused
rejection, product usage and compact presentation controls. The earlier verification
table below belongs to D34–D36.

- **Cause of repeated rice/water:** changing local A1/B1 assignments kept the old
  B3/C3 quantities during partial scans. Repetition itself is valid if packages
  are distinct. Default partial updates still preserve other slots; explicitly
  choosing the whole new reserve zeros unseen slots when saving. The backend test
  verifies exactly six packages after moving three rice and three water packages.
- **Setup:** custom products include declared package kcal and all three macros.
  Unused catalogue entries and all assigned slots are visible. Duplicate types are
  allowed with a caution, not silently merged. Emptying stock is a confirmed,
  separate operation and does not erase crew/health/history or catalogue.
- **Crop:** sides resize only their edge; the centre moves. Eight touch/keyboard
  handles, no Move overlay. Last photo dimensions are restored. Preview uses only
  the selected region; no destructive change to the original image.
- **Feedback:** the scan error receives focus beside Analyse; the photo survives.
  Waiting shows the existing generated companion, elapsed time and next action.
  A finite entry and shared spinner honour reduced motion; no fake progress.
- **Reaction:** 1 + 5 completes in the browser, uses a new protocol and keeps old
  comparisons separate. Modelled timing is not hardware or clinical validation.

### Latest checks and honest limits

92 backend tests and 23 frontend tests pass; both builds, formatting, offline
source scan and whitespace checks pass. Lint has no errors and 10 existing
warnings. JS bundles remain about 843 kB station / 820 kB crew; images remain large.

[Six capture/setup/reaction checks](../design/2026-11-15/crop-setup-checks.json)
and [three layout/product checks](../design/2026-11-15/settings-products-checks.json)
use Chrome on David's Mac. Browser mutations are intercepted; backend tests use
throwaway databases. No current stock was automatically cleared. The screenshot
proposals are controlled UI fixtures, not model-accuracy evidence.

React review: usage is derived in render, requests remain in event handlers,
no added dependency, stable item/slot keys and shared buttons/icons/tokens.
Anti-vibecode: removed the row-height gap, retained the existing palette and
visual hierarchy, no decoration to fill space. Human-brain-ux: showing product
usage removes the need to remember other slot assignments; this is a local design
hypothesis responding to David's feedback, not a user study. Its tradeoff is more
text in the preparation sheet. Keyboard selection, focus return and reduced motion
were checked; no screen-reader audit. Desktop 1024/1280 fits. The shared sheet fits
390px, but **the surrounding station header/nav still overflow at that width**.
Do not claim the entire station is phone-ready.

David's screenshot showed rice counted as 1 where 3 bags were visible, with water
3/3. This is a user-observed failure, not an independently repeated benchmark.
This UI pass does not improve Qwen counting accuracy. New photos, actual camera,
physical phone/LAN, video and Massi's machine remain to test. Earth link has backend
scenario tests; the full UI/presentation rehearsal is proposed for Massi, not done.

## What the product actually does

Each labelled slot has **one assigned product type** and can contain several
identical packages. The person assigns the type; Qwen proposes the count.
The catalogue supplies nutrition. Neither food identity nor calories are inferred
freely from the picture. Existing nutrition and the ×212 mission scale are demo
assumptions, not the contents of a newly purchased package.

The per-photo frame accepts 1–3 rows × 1–4 columns. A 2×2 frame uses A1, A2,
B1, B2 with their existing assignments. Changing dimensions does not recognise
or reassign products. The person must check those assignments when rearranging
the shelf. Labels start at A1; this is not an arbitrary selection of remote slots.
By default, the remaining slots retain their previous stock; the explicit
whole-new-reserve review option instead zeros unseen slots at save. A new photo cannot see items
hidden behind other packages. An aligned rectangular layout is required; there
is no perspective correction or unstructured-bin recognition.

The former “Assign products” link discarded the current photo and opened the
technical calibration screen. It now opens an inline catalogue picker, limited
to the photographed slots, and returns to the same image/frame. Reassigning a
product invalidates the old quantity: it is unknown and excluded from meal/stock
calculations until recounted. The advanced calibration page remains for capacities/reference geometry and is
not redesigned. The shared product form now asks for name, kcal and macros per
whole package; existing seeded catalogue values remain demo data.

## Implemented and checked

- Shared station/crew capture: source → camera preview or file → frame → proposed
  counts → explicit human confirmation → save. Camera capture, exit, denial,
  retry and hidden-tab cleanup release the stream; no continuous video inference.
- Move the entire frame or a corner, by pointer or arrow keys; row/column controls
  have limits. Upload carries this photo's boxes without rewriting global geometry.
- Live scans only stage a proposal. Rejecting/discarding a photo does not change
  stock. Server validation rejects stale proposals, invalid counts and duplicate
  saves; partial scans preserve unseen quantities and their pending meals.
- A preliminary local scene check can reject unrelated/unclear images before
  the catalogue-biased counting prompt. This guard is itself fallible.
- Physical package counts precede mission projections. The active mission alone
  has a full-width illustration/CTA; changing mission links to Settings. Delay
  simulation is one compact action; details open on demand.
- Header identifies the active mission. Settings separates mission/phones,
  presentation tools, and local AI. QR uses the serving port, not a hardcoded one.
- Guide uses four labelled topics, short steps and factual callouts. The existing
  generated mascot identifies help; it does not fill a blank area or give advice.
  Credits centre HESTIA, authors and small unmodified ESGI/Space Apps marks.

## React, anti-vibecode and human-brain-ux review

This is a targeted code/design review plus browser checks, not a usability study,
full accessibility audit or certification of the whole design system.

| Lens | Finding and retained decision | Evidence / limit |
|---|---|---|
| Shared components | Both apps use ShelfCapture, ShelfCamera, ShelfFrameEditor and ShelfScanReview, with existing Button/DetailSheet/FoodIcon | Both builds, no new dependency |
| React effects | Streams, object URLs, subscriptions/timers have cleanup; interactions initiate requests; stale scan responses are ignored/discarded | Code review and fake camera tracks stopped after capture/Escape |
| Async feedback | Loading, permission refusal, scan failure, review and saved state differ; inventory is not written by analysis | Browser API stubs plus real HTTP backend tests |
| Keyboard | Named controls, arrow-key frame adjustment, modal focus loop both ways, Escape and focus restoration | Chrome assertions; no screen-reader test |
| Motion | Existing shared sheet entry/exit and reduced-motion rules reused; no new loop or per-frame React animation | Reduced-motion sheet has no animation; not a phone FPS/battery measurement |
| Visual hierarchy | Count first, mission projection secondary; visible CTA, small consistent icons; no decorative fill | Screens at 1024/1280/1440, mobile 390; David's visual judgement remains separate |
| Mental model | Explicit product assignment, photo before counting, verification before stock save | Responds to David's observed confusion; comprehension by new users not tested |
| Content | Guide topics replace the accordion pile; Settings distinguishes operational actions from presentation controls | Actual screens inspected; complete French coverage remains unfinished |

Tradeoff: predefined slots simplify an unreliable counting task but require setup
and constrain the demo. They must not be marketed as unrestricted food recognition.
The recommended demo is a few known real products, configured once, then a
before/after removal. Keep manual correction available and show the model's actual
errors. Do not present a replay as live vision.

## Verification on David's Mac

| Check | Result |
|---|---|
| Backend | 88 tests pass, including 12 proposal/frame/catalogue tests; temporary DB |
| Frontend | 22 tests pass: 16 crew, 6 station |
| Station and crew builds | Pass; JS bundle warnings remain (~833 / 811 kB) |
| Formatting / lint | Prettier passes; Oxlint no errors, 10 existing warnings |
| Offline source scan / diff whitespace | Pass; not a physical disconnected-network rehearsal |
| Browser | 11 recorded checks, no JS errors; actual layout/screens inspected |
| Camera | Fake browser stream only; capture/close releases tracks; denial fallback |
| Phone link | Correct preview port 8011 verified; LAN reachability not verified |

[Browser evidence and captures](../design/2026-11-15/README.md#camera-pantry-and-settings-review).
Browser upload/save responses are stubbed so the preview stock is not modified;
backend tests separately exercise the HTTP/persistence behavior. Selector ambiguity
in the browser harness was corrected by scoping the slot button to the open dialog.

### Real model checks, separate from automated tests

With the already loaded `qwen2.5vl:7b` model:

- The user's unrelated logo was rejected by the scene check in 4.02 s.
- The existing generated shelf fixture was accepted as a food-storage scene in
  17.42 s. This does **not** test its counts.
- A separate real HTTP logo upload returned 400 in 11.56 s, with inventory exactly
  unchanged before/after.

[Raw scene replies](vision-2026-11-15/scene-real-check.json) and
[HTTP result](vision-2026-11-15/logo-http-check.json). These are two known images,
not an independent accuracy benchmark. Timings exclude a cold model load.
Claude's 24/24 counts still refer to his two tuning fixtures only.

## Remaining limits and handoff

1. Real shelf, camera hardware, lighting, phone/LAN, Massi's machine and full demo
   rehearsal are not checked. Try a few real products, repeated angles/light,
   empty slots, one removal, and unrelated images. Record exact errors and time.
2. Vision/video ownership stays with Claude/Fable. No new model, training,
   download or camera claim. A stronger computer alone cannot establish accuracy.
3. Proposals expire after 30 minutes, maximum 20 in memory, and disappear on
   restart. Single station worker assumed. Captures are git-ignored and not
   automatically purged. This is not a production inventory architecture.
4. The isolated preview is bound to 127.0.0.1:8011 with its original disposable DB;
   showing a LAN QR does not make that server accessible from a phone. Use a
   deliberately LAN-bound server and test it before inviting the jury.
5. Optional replayable jury onboarding remains requested, not implemented.
   Simulator/Earth screens, full crew/tablet review, remaining copy/charts/icons,
   mascot identity/poses and broader performance/accessibility work remain open.
6. Finish the NASA submission draft, assets and real rehearsal separately.
   Xcode was explicitly dropped. No commit, push, merge or publication occurred.

### Model-training question

Ollama runs imported model weights; putting a folder of photos beside it does
not train them ([official import documentation](https://docs.ollama.com/import)).
Qwen publishes a separate training workflow requiring a configured image/answer
dataset and training scripts ([Qwen training tools](https://github.com/QwenLM/Qwen3-VL/tree/main/qwen-vl-finetune)).
A useful future evaluation would separate annotated training examples from unseen
test photos, include empty/irrelevant images and score object identity/counts.
Dataset size alone is not a reliability claim. For this deadline, benchmark the
existing pipeline on the actual demo scene before considering another model or
training; freely recognising mixed products remains a separate scope decision.
