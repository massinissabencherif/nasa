# Vision: cross-check of two readings (15 Nov 2026)

Branch `fix/vision-reliability`, separate worktree, not merged. Scope: the shelf
reading on the server. Nothing in the screens was changed.

## What was measured

Real `qwen2.5vl:7b` through Ollama on David's Mac, on the two AI-generated test
images. **Two images, one run per setting: a tiny sample, not a proof.** Ground
truth was counted by eye on 15 Nov (29 boxes; A1 empty after removal).
Scripts and raw outputs are in `vision-2026-11-15/`.

| Setting | Full shelf | After removal | Errors a person is not told about |
|---|---|---|---|
| Current whole-image reading | 11/12 (A3 read 2, truth 4) | 10/12 (A1 read 1, truth 0; A3) | A1 |
| Whole image without naming the expected food | 10/12 (A3; empty A4 read 1) | 10/12 (A3; empty A4 read 1) | A4 |
| One question on the A1 crop alone | — | A1 read 0 (correct) | — |
| **Cross-check (this change)** | 11/12 (A3) | 11/12 (A3) | **none** |

The cross-check reads the whole shelf, then each row, keeps the row reading and
flags any slot where the two differ or where one has no valid answer. On these
images the flagged slots were A3 (a stack: always sent to confirmation) and,
after removal, A1.

## Reading the result honestly

- It does **not** make the model count better. A3, a 2 × 2 stack of four cans,
  is read as 2 in every setting.
- It makes a wrong reading **visible**: no wrong slot went unflagged. Two
  readings that agree can still share a mistake (the stack).
- Removing the food names from the prompt only moved the error from A1 to A4.
  The priming idea was not the whole cause.
- Duration: the first image took 37 s. The second took 19 s because Ollama had
  already seen some of the row crops: do not quote 19 s.
- Not tested: a real shelf, real lighting, a phone photo, a webcam frame, other
  products, repeated runs for variability.

## What changed in the code

`server/vision/pipeline.py`: `_read_full`, `_read_rows`, `cross_check` and the
strategy `cross` (also accepted as `HESTIA_VISION_STRATEGY=cross` and as the
`strategy` parameter of `POST /api/pantry/scan`). The raw answer of both
passes is kept in the scan's `raw_json`. Three tests in `tests/test_vision.py`.
The station screens do not offer this mode yet: it needs a choice in the pantry
screen, which belongs to the UI work in progress on another branch.

## Second pass, same day: the stack, photo checks, camera, evaluation bench

### Why the stack was read as 2

The A3 crop sent to the model is correct (see `vision-2026-11-15/a3-crop.jpg`):
four flat cans, two columns of two. Each column looks like one tall can with a
band, and the model said so when asked to describe it. One change at a time:

| Change on the A3 crop | Answer (truth 4) |
|---|---|
| Plain count | 0 |
| "Count every layer" | 2 |
| Larger image (768 px) | 2 |
| Describe the product's shape | 2 |
| Columns, then layers, then total | 2 columns × 1 layer = 2 |
| **Rows from top to bottom, then items per row, then total** | **2 × 2 = 4** |
| Same question on a tighter crop | 4 |
| Tighter crop with the old question | 2 |

So the question fixed it, not the crop. Asked on **every** compartment, that
question is wrong elsewhere: peanut-butter jars read 4 instead of 2 and water
pouches 6 instead of 3 (10/12 on each image). It is therefore asked only for
products the catalogue declares as stacked (`"stacked": true`), as a third
reading inside the `cross` strategy, and its answer is kept only when rows ×
items per row equals the total. The slot still goes to a person.

### Result of the full `cross` strategy

| Image (both used for tuning) | Exact | Silent errors | Sent to a person |
|---|---|---|---|
| Full shelf | 12/12 | 0 | A3 |
| After removal | 12/12 | 0 | A1, A3 |

**This is a result on the two images the method was adjusted on. It is not
evidence that it works on a real shelf.** There is no held-out photo yet. The
durations of that run (10–12 s) are from images Ollama had already seen: do not
quote them. A first-time scan makes one whole-shelf call, three row calls and
one call per stacked product; expect roughly a minute, to be measured.

### Also added

- `vision/quality.py`: warnings about the photo itself (blur, too dark, too
  bright, clipped), returned by the scan route as `warnings`. The limits are
  assumptions; they warn and never block.
- Camera: a burst of 8 frames, the sharpest is kept (`capture_from_webcam`).
  A live camera is read as one chosen picture. Not tried on a real webcam.
- `python -m vision.evaluate <folder>`: exact slots, silent errors, items seen
  in empty slots, undercounts, slots sent to a person, seconds per scan, with a
  `tune` / `holdout` split. Truth file format in the module docstring; the two
  fixtures have one in `server/vision/fixtures/truth.json`.

### How to give this a real answer

Put about ten photos of the real shelf in `server/vision/real-photos/` (ignored
by git), with a `truth.json` counted by hand: empty, full, one box removed, a
stack, daylight, lamp, a slight angle. Mark at least half as `holdout` and never
adjust anything on them. Calibrate the grid first (station, Pantry → Calibrate).
Then: `python -m vision.evaluate vision/real-photos --split holdout`.

### Not done

The station does not offer the `cross` mode yet (the pantry screen is being
reworked on another branch). `STATUS.md`, `decisions.md` and
`vision-benchmark.md` were not edited here because they have uncommitted
changes on that branch: this report is the record until the branches meet.
