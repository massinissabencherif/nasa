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

import numpy as np

from . import capture, grid, ollama_client
from .catalogue_loader import load_ground_truth, load_removal_slot, load_slot_items
from .schema import SlotReading

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
    where = (
        "a 3x4 shelf with 12 compartments, rows A (top) to C (bottom), columns 1 (left) to 4 (right)"
        if full
        else "FOUR shelf compartments side by side, left to right"
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


def scan_live(
    image, boxes, slot_items, strategy: str | None = None,
    capacities: dict[str, int] | None = None,
    on_progress: ProgressCallback | None = None,
) -> ScanResult:
    strategy = strategy or DEFAULT_STRATEGY
    labels = list(boxes.keys())
    start = time.perf_counter()
    if strategy == "full":
        counts = _call(capture.downscale(image, FULL_IMAGE_WIDTH), labels, slot_items, True, on_progress)
    elif strategy == "row":
        counts = {}
        for row_labels in grid.ROWS.values():
            crop = grid.crop_box(image, grid.row_box(boxes, row_labels))
            done_before = [label for label, value in counts.items() if value is not None]
            counts.update(_call(
                crop, row_labels, slot_items, False,
                (lambda done, base=done_before: on_progress(base + done)) if on_progress else None,
            ))
    else:
        raise ValueError(f"unknown vision strategy '{strategy}'")
    elapsed = time.perf_counter() - start

    readings: dict[str, SlotReading] = {}
    needs_confirmation: set[str] = set()
    for label in labels:
        confidence, note = _plausibility(
            label, counts[label], slot_items[label], (capacities or {}).get(label)
        )
        readings[label] = SlotReading(count=counts[label] or 0, confidence=confidence, note=note)
        if confidence < LOW_CONFIDENCE_THRESHOLD:
            needs_confirmation.add(label)
    return ScanResult(readings, needs_confirmation, elapsed, strategy, {"counts": counts})


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
) -> ScanResult:
    if mode == "mock":
        return scan_mock(variant)

    boxes = grid.load_boxes()
    slot_items = load_slot_items()
    capacities = grid.load_capacities()
    if mode == "image":
        if image_path is None:
            raise ValueError("mode='image' requires image_path")
        img = capture.load_image(image_path)
    elif mode == "camera":
        img = capture.capture_from_webcam(camera_index)
    else:
        raise ValueError(f"unknown scan mode '{mode}'")

    result = scan_live(img, boxes, slot_items, strategy=strategy, capacities=capacities, on_progress=on_progress)
    if mode == "camera":
        result.frame = img
    else:
        result.image_path = image_path
    return result
