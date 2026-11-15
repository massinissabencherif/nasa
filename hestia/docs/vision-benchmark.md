# Vision benchmark (M1)

Measured on the development machine: MacBook Air M2, 16 GB, Ollama,
`qwen2.5vl:7b` (Q4_K_M), temperature 0, model already in memory.
Test image: `server/vision/fixtures/shelf_full.png` (AI-generated, 12 slots,
29 units) and `shelf_after_removal.png` (same image with the three A1 cans
removed). Ground truth is in `server/data/food_catalogue.json`.

## 15 Nov verification update

Real Ollama pipeline runs reproduced 11/12 (full) and 10/12 (empty A1) for
whole-image mode; row mode gave 11/12 for both. The initial temporary scoring
of empty A1 as 2 was wrong; the image shows zero. Raw outputs, corrected scores,
API/manual-correction evidence and cache/timing limits are in the
[15 Nov review](sources/2026-11-15-interactions-and-evidence.md).
No model improvement is claimed. Reproduce with
`server/.venv/bin/python scripts/verify_vision_fixtures.py` from `hestia/`.
The UI calls row mode “three-pass scan” and unconfirmed counts “not checked by
a person”; an unflagged plausible error occurred. Every slot needs human review.
The older measurements below are historical and not a substitute for a real shelf.

## What a call costs

Two numbers explain every result below:

- **About 14 s to encode any image the model has not seen before**, almost
  independent of its size below ~1024 px (about 1,200 prompt tokens; a 1280 px
  image costs 1,770 tokens and 20 s).
- **About 0.06 s per generated token.**

Ollama caches the encoding of an image it has just seen, so re-scanning the
same file looks much faster (4–5 s per call). Earlier numbers in this project
(16 s for three row crops) were measured on a cached image and were too
optimistic. **A live webcam frame is never cached**, so the table uses
first-time timings.

## Results (first-time image, 11 Nov 2026)

| Strategy | Calls | Latency | Full shelf | After removal |
|---|---|---|---|---|
| Single image, 768 px, integer-only JSON schema (**default**) | 1 | **19.4 s** | 11/12 | 10/12 |
| Single image, 1024 px, same schema | 1 | 19.4 s | 10/12 | 9/12 |
| Single image, 1280 px, same schema | 1 | 26.7 s | 11/12 | 9/12 |
| Row crops, integer-only schema ("accurate mode") | 3 | 46–55 s | 11/12 | 11/12 |
| Per-slot crops (earlier run, old prompt) | 12 | 180 s | 9/12 | not run |
| Baseline in the brief: single image, free-form JSON | 1 | ~35 s first time | 10/12 | not run |

Misses:

- **A3, stacked tuna cans (2×2): read as 2 or 3 instead of 4 by every
  strategy and every prompt tried.** A depth-perception limit of this model.
- Single-image mode read the emptied A1 slot as 1 instead of 0 on the
  after-removal image, and (at 1024/1280 px) C3 as 4 instead of 3.
- Row crops got the emptied A1 right.

## What we changed to beat the 10/12 baseline and reach 20 s

1. **Structured output**: the answer must match a JSON schema with one
   integer per slot label. Output drops from ~300 tokens to ~100, and the
   model can no longer skip a slot or return malformed JSON.
2. **Stopped asking the model for a confidence**: it answered 1.0 every time.
   `confidence` is now a plausibility score computed in code
   (`vision/pipeline.py::_plausibility`): no valid answer, count above the
   slot capacity, items seen in a slot that should be empty, or a slot known
   to hold stacked items all fall below 0.6 and trigger the on-screen
   "check count" step.
3. **A3 is always sent to confirmation** (catalogue flag `"stacked": true`)
   instead of pretending it is read correctly. Confirming a count also
   corrects the consumption feed.
4. **Two modes in the UI**: default single image (~20 s) and "Accurate mode"
   (three row crops, ~50 s) for when half a minute is acceptable.
5. Streaming is used to show per-slot progress while the answer is written.

## Honest summary

- The ≤ 20 s target is met by the default mode (19.4 s measured, little
  margin), not by the more accurate one.
- Accuracy on a real shelf under venue lighting is unknown until we test on
  site. The fallback chain is: accurate mode → manual confirmation of flagged
  slots → replay scan (no AI) with known counts.
- Vision errors propagate into consumption tracking; that is why uncertain
  slots are confirmed by a human before anyone relies on the feed.

Reproduce: `cd server && uv run python -m vision.benchmark` (older strategies)
or run a scan from the station with each test image.
