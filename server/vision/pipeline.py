"""Production shelf-reading pipeline. Strategy choice and prompts are the
result of the benchmark in vision/benchmark.py (see docs/STATUS.md phase 2):
row crops (3 VLM calls) gave the best accuracy (11/12 exact vs the 10/12
baseline) and are kept as the default, even though neither row nor any other
strategy reliably hit the ≤20s-warm target on this qwen2.5vl:7b + M2 setup
(measured ~55s for row, ~35s for a single full-image call). Full-image stays
available as a faster, lower-accuracy fallback (PROMPT_FABLE.md §4 step 3).
"""

import json
import time
from dataclasses import dataclass

from . import capture, grid, ollama_client
from .catalogue_loader import load_ground_truth, load_slot_items
from .schema import SlotReading, ValidationError

LOW_CONFIDENCE_THRESHOLD = 0.6


@dataclass
class ScanResult:
    readings: dict[str, SlotReading]
    needs_confirmation: set[str]
    elapsed_s: float
    strategy: str
    raw_json: dict[str, dict]


def _parse_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _reading_from_entry(entry: dict | None) -> SlotReading:
    if entry is None:
        return SlotReading(count=0, confidence=0)
    try:
        return SlotReading(**entry)
    except ValidationError:
        return SlotReading(count=0, confidence=0)


def _row_prompt(labels: list[str], slot_items: dict[str, dict | None]) -> str:
    descriptions = [
        f"{label}: {'empty shelf (expected)' if slot_items[label] is None else slot_items[label]['name']}"
        for label in labels
    ]
    return (
        f"This image shows FOUR shelf compartments side by side, left to right: "
        f"{', '.join(descriptions)}. For each compartment, count how many units are "
        f"visible (0 if empty). Some compartments stack items in multiple layers "
        f"(e.g. 2 rows of 2 cans, one behind/above the other) — look carefully and "
        f"count every visible layer, not just the front row. "
        f'Reply ONLY as JSON: {{"slots": [{{"label": "...", "count": int, "confidence": 0-1}}, '
        f'... one entry per compartment in order]}}'
    )


def _call_row(img, boxes, slot_items, labels: list[str]) -> dict[str, dict]:
    box = grid.row_box(boxes, labels)
    crop = grid.crop_box(img, box)
    b64 = grid.encode_png_base64(crop)
    prompt = _row_prompt(labels, slot_items)
    result = ollama_client.generate(prompt, images_b64=[b64])
    parsed = _parse_json(result["response"]) or {}
    return {s.get("label"): s for s in parsed.get("slots", [])}


def _scan_rows(img, boxes, slot_items) -> tuple[dict[str, dict], str]:
    by_label: dict[str, dict] = {}
    raw: dict[str, dict] = {}
    for labels in grid.ROWS.values():
        entries = _call_row(img, boxes, slot_items, labels)
        missing = [label for label in labels if label not in entries]
        if missing:
            # one retry for the whole row on malformed/incomplete JSON
            entries = _call_row(img, boxes, slot_items, labels)
        for label in labels:
            raw[label] = entries.get(label)
    return raw, "row"


def _full_prompt(labels: list[str], slot_items: dict[str, dict | None]) -> str:
    descriptions = [
        f"{label}: {'empty shelf (expected)' if slot_items[label] is None else slot_items[label]['name']}"
        for label in labels
    ]
    return (
        f"This image shows a 3x4 shelf with 12 labelled compartments: {', '.join(descriptions)}. "
        f"For each compartment, count how many units of its expected item are visible "
        f"(0 if empty), counting stacked units in every layer. "
        f'Reply ONLY as JSON: {{"slots": [{{"label": "...", "count": int, "confidence": 0-1}}, '
        f"... one entry per compartment]}}"
    )


def _scan_full(img, boxes, slot_items) -> tuple[dict[str, dict], str]:
    labels = list(boxes.keys())
    b64 = grid.encode_png_base64(img)
    prompt = _full_prompt(labels, slot_items)
    result = ollama_client.generate(prompt, images_b64=[b64])
    parsed = _parse_json(result["response"]) or {}
    missing_all = not parsed.get("slots")
    if missing_all:
        result = ollama_client.generate(prompt, images_b64=[b64])
        parsed = _parse_json(result["response"]) or {}
    by_label = {s.get("label"): s for s in parsed.get("slots", [])}
    return {label: by_label.get(label) for label in labels}, "full"


def scan_live(image, boxes, slot_items, strategy: str = "row") -> ScanResult:
    start = time.perf_counter()
    if strategy == "row":
        raw, used = _scan_rows(image, boxes, slot_items)
    elif strategy == "full":
        raw, used = _scan_full(image, boxes, slot_items)
    else:
        raise ValueError(f"unknown vision strategy '{strategy}'")
    elapsed = time.perf_counter() - start

    readings: dict[str, SlotReading] = {}
    needs_confirmation: set[str] = set()
    for label, entry in raw.items():
        reading = _reading_from_entry(entry)
        readings[label] = reading
        if reading.confidence < LOW_CONFIDENCE_THRESHOLD:
            needs_confirmation.add(label)

    return ScanResult(readings, needs_confirmation, elapsed, used, raw)


def scan_mock() -> ScanResult:
    """Replay the fixture's ground truth — no camera, no Ollama required."""
    ground_truth = load_ground_truth()
    readings = {
        label: SlotReading(count=count, confidence=1.0, note="mock")
        for label, count in ground_truth.items()
    }
    return ScanResult(readings, set(), 0.0, "mock", {})


def run_scan(mode: str, image_path: str | None = None, camera_index: int = 0, strategy: str = "row") -> ScanResult:
    if mode == "mock":
        return scan_mock()

    boxes = grid.load_boxes()
    slot_items = load_slot_items()
    if mode == "image":
        if image_path is None:
            raise ValueError("mode='image' requires image_path")
        img = capture.load_image(image_path)
    elif mode == "camera":
        img = capture.capture_from_webcam(camera_index)
    else:
        raise ValueError(f"unknown scan mode '{mode}'")

    return scan_live(img, boxes, slot_items, strategy=strategy)
