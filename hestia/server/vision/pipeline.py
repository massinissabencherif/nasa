"""Production shelf-reading pipeline.

Strategy (measured on this MacBook Air M2 with qwen2.5vl:7b, see
docs/vision-benchmark.md): the cost of a call is dominated by encoding the
image (~14 s for any *new* image, whatever its size below ~1024 px) plus
~0.06 s per generated token. So the fastest accurate scan is ONE call on the
whole shelf with the shortest possible answer: a JSON object mapping each
slot label to an integer, enforced by a JSON schema (structured output).
That is ~19 s for a frame the model has never seen, against ~55 s for three
row crops. Row crops stay available (HESTIA_VISION_STRATEGY=row).

The VLM's self-reported confidence was always 1.0, i.e. useless, so it is no
longer requested. `confidence` is now a plausibility score computed here from
things we can actually check (see _plausibility).
"""

import json
import os
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from . import capture, grid, ollama_client, quality
from .catalogue_loader import load_ground_truth, load_removal_slot, load_slot_items
from .schema import SlotReading
from .scene import check_shelf

LOW_CONFIDENCE_THRESHOLD = 0.6
FULL_IMAGE_WIDTH = 768
DEFAULT_STRATEGY = os.environ.get("HESTIA_VISION_STRATEGY", "full")
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

ProgressCallback = Callable[[list[str]], None]


@dataclass
class ScanResult:
    readings: dict[str, SlotReading]
    needs_confirmation: set[str]
    elapsed_s: float
    strategy: str
    raw_json: dict
    image_path: str | None = None  # file the scan was read from (fixture / still image)
    frame: np.ndarray | None = None  # webcam frame of a live scan (not yet on disk)
    # last on purpose: older callers build this result with positional arguments
    warnings: list[str] | None = None  # about the photo itself (blur, light), see quality.py


def _describe(labels: list[str], slot_items: dict[str, dict | None]) -> str:
    return ", ".join(
        f"{label}: {'empty (expected)' if slot_items[label] is None else slot_items[label]['name']}"
        for label in labels
    )


_COUNTING_RULES = (
    "For each compartment, count how many units are visible (0 if empty). Some compartments "
    "stack items in multiple layers (e.g. 2 rows of 2 cans, one above the other) — count every "
    "visible layer, not just the front row. Reply ONLY as JSON mapping each compartment label "
    "to its integer count."
)


def _prompt(labels: list[str], slot_items: dict[str, dict | None], full: bool) -> str:
    rows = len({label[0] for label in labels})
    columns = len({label[1:] for label in labels})
    where = (
        f"a {rows}x{columns} storage layout with {len(labels)} compartments, labelled in row-major order from top-left: {', '.join(labels)}"
        if full
        else f"{len(labels)} shelf compartments side by side, left to right"
    )
    return f"This image shows {where}: {_describe(labels, slot_items)}. {_COUNTING_RULES}"


def _schema(labels: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {label: {"type": "integer"} for label in labels},
        "required": labels,
    }


def _parse_counts(text: str, labels: list[str]) -> dict[str, int | None]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    out: dict[str, int | None] = {}
    for label in labels:
        value = data.get(label)
        out[label] = value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None
    return out


def _call(img, labels, slot_items, full: bool, on_progress: ProgressCallback | None) -> dict[str, int | None]:
    b64 = grid.encode_jpeg_base64(img)
    prompt = _prompt(labels, slot_items, full)
    seen: list[str] = []

    def on_text(text_so_far: str) -> None:
        # per-slot progress: a label counts as done once its integer has been generated
        done = re.findall(r'"([A-C][1-4])"\s*:\s*\d+\s*[,}]', text_so_far)
        if on_progress and len(done) > len(seen):
            seen[:] = done
            on_progress(done)

    for _attempt in range(2):  # one retry on invalid / incomplete JSON
        text = ollama_client.generate_stream(prompt, [b64], schema=_schema(labels), on_text=on_text)
        counts = _parse_counts(text, labels)
        if all(v is not None for v in counts.values()):
            break
    return counts


def _plausibility(label: str, count: int | None, item: dict | None, capacity: int | None) -> tuple[float, str]:
    """Score how much a count can be trusted, from checks done in code."""
    if count is None:
        return 0.0, "no valid answer from the model"
    if item is None and count > 0:
        return 0.4, "items seen in a slot that should be empty"
    if capacity is not None and count > capacity:
        return 0.3, "count is above the slot capacity"
    if item is not None and item.get("stacked") and count > 0:
        return 0.5, "stacked items: the model tends to undercount hidden layers"
    return 0.95, ""


SHELF_CROP_MARGIN = 0.03


def _crop_to_shelf(image, boxes):
    """On a real photo the shelf may fill only part of the frame. When the
    calibrated grid covers less than 60 % of the picture, send only the shelf
    (plus a small margin) so the model does not count the background."""
    x0 = min(b[0] for b in boxes.values())
    y0 = min(b[1] for b in boxes.values())
    x1 = max(b[2] for b in boxes.values())
    y1 = max(b[3] for b in boxes.values())
    if (x1 - x0) * (y1 - y0) >= 0.6:
        return image
    m = SHELF_CROP_MARGIN
    return grid.crop_box(image, (max(0.0, x0 - m), max(0.0, y0 - m), min(1.0, x1 + m), min(1.0, y1 + m)))


def _read_full(image, boxes, slot_items, labels, on_progress) -> dict[str, int | None]:
    """One call on the whole shelf."""
    return _call(
        capture.downscale(_crop_to_shelf(image, boxes), FULL_IMAGE_WIDTH), labels, slot_items, True, on_progress
    )


def _read_rows(image, boxes, slot_items, on_progress) -> dict[str, int | None]:
    """One call per shelf row, each on its own crop."""
    counts: dict[str, int | None] = {}
    for row_labels in grid.ROWS.values():
        row_labels = [label for label in row_labels if label in boxes]
        if not row_labels:
            continue
        crop = grid.crop_box(image, grid.row_box(boxes, row_labels))
        done_before = [label for label, value in counts.items() if value is not None]
        counts.update(_call(
            crop, row_labels, slot_items, False,
            (lambda done, base=done_before: on_progress(base + done)) if on_progress else None,
        ))
    return counts


STACK_WIDTH = 768
_STACK_SCHEMA = {
    "type": "object",
    "properties": {"rows": {"type": "integer"}, "per_row": {"type": "integer"}, "count": {"type": "integer"}},
    "required": ["rows", "per_row", "count"],
}


def _stack_prompt(name: str) -> str:
    return (
        f"This image shows one compartment of a shelf holding {name}. Items can stand side by side and "
        "can be stacked on top of each other. Count the horizontal rows of items from top to bottom "
        "(1 if nothing is stacked), then the items in one row, then the total. If the compartment is "
        "empty, answer 0 for all three. Reply as JSON."
    )


def read_stack(image, box, item: dict) -> int | None:
    """Second look at one compartment whose product is declared as stacked in
    the catalogue: the model is asked for rows and items per row, which is the
    question that made it see a 2 x 2 stack it otherwise read as 2 tall cans.
    Asked on every compartment, the same question over-counts jars and pouches
    (measured 15 Nov), so it is only used where the crew says items are stacked.
    Returns None unless the answer is a valid, self-consistent count."""
    crop = grid.crop_box(image, box)
    height, width = crop.shape[:2]
    scale = STACK_WIDTH / width
    resized = cv2.resize(crop, (STACK_WIDTH, max(1, round(height * scale))), interpolation=cv2.INTER_CUBIC)
    name = f"{item['name'].lower()}s"
    try:
        answer = ollama_client.generate(
            _stack_prompt(name), [grid.encode_jpeg_base64(resized)], timeout=120.0, schema=_STACK_SCHEMA
        )
        data = json.loads(answer.get("response", ""))
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    rows, per_row, count = data.get("rows"), data.get("per_row"), data.get("count")
    if not all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in (rows, per_row, count)):
        return None
    return count if rows * per_row == count else None


def cross_check(
    full: dict[str, int | None], rows: dict[str, int | None]
) -> tuple[dict[str, int | None], dict[str, str]]:
    """Compare two independent readings of the same shelf.

    The value kept is the row reading (it was the one that did not invent a
    box in an empty compartment on the two test images: a small sample, not
    a proof). A slot where the readings differ, or where one of them has no
    valid answer, is returned in `disagreements` with a plain explanation, so
    that the person checks it. Two readings that agree prove nothing: they can
    share the same mistake (a stack read as 2 by both is the known case)."""
    disagreements: dict[str, str] = {}
    for label, row_value in rows.items():
        full_value = full.get(label)
        if row_value is None or full_value is None:
            disagreements[label] = "one of the two readings has no valid answer"
        elif row_value != full_value:
            disagreements[label] = f"the two readings disagree: whole shelf {full_value}, by rows {row_value}"
    return rows, disagreements


def scan_live(
    image, boxes, slot_items, strategy: str | None = None,
    capacities: dict[str, int] | None = None,
    on_progress: ProgressCallback | None = None,
) -> ScanResult:
    strategy = strategy or DEFAULT_STRATEGY
    labels = list(boxes.keys())
    start = time.perf_counter()
    disagreements: dict[str, str] = {}
    raw: dict = {}
    if strategy == "full":
        counts = _read_full(image, boxes, slot_items, labels, on_progress)
    elif strategy == "row":
        counts = _read_rows(image, boxes, slot_items, on_progress)
    elif strategy == "cross":
        full = _read_full(image, boxes, slot_items, labels, None)
        rows = _read_rows(image, boxes, slot_items, on_progress)
        counts, disagreements = cross_check(full, rows)
        stacks: dict[str, int | None] = {}
        for label in labels:
            item = slot_items.get(label)
            if item is not None and item.get("stacked"):
                stacks[label] = read_stack(image, boxes[label], item)
                if stacks[label] is not None:
                    counts[label] = stacks[label]
        raw = {"full": full, "rows": rows, "stacks": stacks, "disagreements": sorted(disagreements)}
    else:
        raise ValueError(f"unknown vision strategy '{strategy}'")
    elapsed = time.perf_counter() - start

    readings: dict[str, SlotReading] = {}
    needs_confirmation: set[str] = set()
    for label in labels:
        confidence, note = _plausibility(
            label, counts[label], slot_items[label], (capacities or {}).get(label)
        )
        if label in disagreements:
            # a disagreement caps the plausibility: a person must look at this slot
            confidence = min(confidence, 0.3)
            note = disagreements[label] if not note else f"{disagreements[label]}; {note}"
        readings[label] = SlotReading(count=counts[label] or 0, confidence=confidence, note=note)
        if confidence < LOW_CONFIDENCE_THRESHOLD:
            needs_confirmation.add(label)
    return ScanResult(
        readings, needs_confirmation, elapsed, strategy, {"counts": counts, **raw}, warnings=quality.assess(image)
    )


def scan_mock(variant: str = "full") -> ScanResult:
    """Replay a fixture's ground truth — no camera, no Ollama required.
    `after_removal` is the shelf once the demo-script boxes were taken out."""
    counts = dict(load_ground_truth())
    if variant == "after_removal":
        counts[load_removal_slot()] = 0
        image = FIXTURES_DIR / "shelf_after_removal.png"
    elif variant == "full":
        image = FIXTURES_DIR / "shelf_full.png"
    else:
        raise ValueError(f"unknown mock variant '{variant}'")
    readings = {
        label: SlotReading(count=count, confidence=1.0, note="mock") for label, count in counts.items()
    }
    return ScanResult(readings, set(), 0.0, "mock", {"counts": counts, "variant": variant}, str(image))


def run_scan(
    mode: str, image_path: str | None = None, camera_index: int = 0, variant: str = "full",
    strategy: str | None = None, on_progress: ProgressCallback | None = None,
    slot_items: dict[str, dict | None] | None = None, capacities: dict[str, int] | None = None,
    boxes: dict | None = None,
) -> ScanResult:
    """slot_items / capacities: what each slot is supposed to hold (from the
    database). Defaults to the seeded catalogue when not given."""
    if mode == "mock":
        return scan_mock(variant)

    boxes = boxes or grid.load_boxes()
    slot_items = slot_items or load_slot_items()
    capacities = capacities or grid.load_capacities()
    if mode == "image":
        if image_path is None:
            raise ValueError("mode='image' requires image_path")
        img = capture.load_image(image_path)
    elif mode == "camera":
        img = capture.capture_from_webcam(camera_index)
    else:
        raise ValueError(f"unknown scan mode '{mode}'")

    # Check the actual scene before telling the counter what products to expect.
    started = time.perf_counter()
    scene = check_shelf(img)
    result = scan_live(img, boxes, slot_items, strategy=strategy, capacities=capacities, on_progress=on_progress)
    result.raw_json["scene"] = scene
    result.elapsed_s = time.perf_counter() - started
    if mode == "camera":
        result.frame = img
    else:
        result.image_path = image_path
    return result
