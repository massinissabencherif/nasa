"""Benchmark per-slot vs row vs full-image VLM crop strategies on the fixture
shelf image, per PROMPT_ADDENDUM.md #3. Run with:

    uv run python -m vision.benchmark
"""
import json
import time
from concurrent.futures import ThreadPoolExecutor

from . import capture, grid, ollama_client
from .catalogue_loader import load_ground_truth, load_slot_items
from .schema import SlotReading, ValidationError

FIXTURE = "vision/fixtures/shelf_full.png"


def _parse(raw_text: str) -> dict | None:
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return None


def per_slot_prompt(item: dict | None) -> str:
    if item is None:
        return (
            "This image shows ONE shelf compartment, which is expected to be empty. "
            "Count how many separate food/drink units of any kind are visible. Units "
            "may be stacked in multiple layers (e.g. 2 rows of 2) — count every layer, "
            "do not just count the front row. If empty, answer 0. "
            'Reply with ONLY this JSON and nothing else: {"count": int, "confidence": 0-1}'
        )
    return (
        f"This image shows ONE shelf compartment. Count how many separate units of "
        f"{item['name']} are visible. Units may be stacked in multiple layers (e.g. 2 "
        f"rows of 2) — count every layer, do not just count the front row. If the "
        f'compartment is empty, answer 0. Reply with ONLY this JSON and nothing else: '
        f'{{"count": int, "confidence": 0-1}}'
    )


def upscale(img, size: int = 512):
    import cv2
    h, w = img.shape[:2]
    if max(h, w) >= size:
        return img
    scale = size / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)


def run_per_slot(img, boxes, slot_items, concurrency: int = 1) -> tuple[dict[str, SlotReading], float]:
    labels = list(boxes.keys())

    def call_one(label: str) -> tuple[str, SlotReading]:
        crop = upscale(grid.crop_box(img, boxes[label]))
        b64 = grid.encode_png_base64(crop)
        prompt = per_slot_prompt(slot_items[label])
        result = ollama_client.generate(prompt, images_b64=[b64])
        parsed = _parse(result["response"])
        try:
            reading = SlotReading(**parsed) if parsed else SlotReading(count=0, confidence=0)
        except ValidationError:
            reading = SlotReading(count=0, confidence=0)
        return label, reading

    start = time.perf_counter()
    readings: dict[str, SlotReading] = {}
    if concurrency <= 1:
        for label in labels:
            lbl, reading = call_one(label)
            readings[lbl] = reading
    else:
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            for lbl, reading in pool.map(call_one, labels):
                readings[lbl] = reading
    elapsed = time.perf_counter() - start
    return readings, elapsed


def run_row(img, boxes, slot_items) -> tuple[dict[str, SlotReading], float]:
    readings: dict[str, SlotReading] = {}
    start = time.perf_counter()
    for row_letter, labels in grid.ROWS.items():
        box = grid.row_box(boxes, labels)
        crop = grid.crop_box(img, box)
        b64 = grid.encode_png_base64(crop)
        descriptions = []
        for label in labels:
            item = slot_items[label]
            descriptions.append(f"{label}: {'empty shelf (expected)' if item is None else item['name']}")
        prompt = (
            f"This image shows FOUR shelf compartments side by side, left to right: "
            f"{', '.join(descriptions)}. For each compartment, count how many units are "
            f"visible (0 if empty). If cans or jars are stacked two deep (a front row "
            f"and a back row/layer behind or above it), you MUST count both rows, e.g. "
            f"2 visible in front plus 2 more behind/above = 4 total, not 2. "
            f'Reply ONLY as JSON: {{"slots": [{{"label": "...", "count": int, "confidence": 0-1}}, '
            f'... one entry per compartment in order]}}'
        )
        result = ollama_client.generate(prompt, images_b64=[b64])
        parsed = _parse(result["response"]) or {}
        by_label = {s.get("label"): s for s in parsed.get("slots", [])}
        for label in labels:
            entry = by_label.get(label)
            try:
                readings[label] = SlotReading(**entry) if entry else SlotReading(count=0, confidence=0)
            except ValidationError:
                readings[label] = SlotReading(count=0, confidence=0)
    elapsed = time.perf_counter() - start
    return readings, elapsed


def run_full(img, boxes, slot_items) -> tuple[dict[str, SlotReading], float]:
    labels = list(boxes.keys())
    b64 = grid.encode_png_base64(img)
    descriptions = []
    for label in labels:
        item = slot_items[label]
        descriptions.append(f"{label}: {'empty shelf (expected)' if item is None else item['name']}")
    prompt = (
        f"This image shows a 3x4 shelf with 12 labelled compartments: {', '.join(descriptions)}. "
        f"For each compartment, count how many units of its expected item are visible "
        f"(0 if empty), counting stacked units in every layer. "
        f'Reply ONLY as JSON: {{"slots": [{{"label": "...", "count": int, "confidence": 0-1}}, '
        f"... one entry per compartment]}}"
    )
    start = time.perf_counter()
    result = ollama_client.generate(prompt, images_b64=[b64])
    elapsed = time.perf_counter() - start
    parsed = _parse(result["response"]) or {}
    by_label = {s.get("label"): s for s in parsed.get("slots", [])}
    readings = {}
    for label in labels:
        entry = by_label.get(label)
        try:
            readings[label] = SlotReading(**entry) if entry else SlotReading(count=0, confidence=0)
        except ValidationError:
            readings[label] = SlotReading(count=0, confidence=0)
    return readings, elapsed


def score(readings: dict[str, SlotReading], ground_truth: dict[str, int]) -> int:
    return sum(1 for label, gt in ground_truth.items() if readings[label].count == gt)


def print_table(name: str, readings: dict[str, SlotReading], ground_truth: dict[str, int], elapsed: float) -> None:
    exact = score(readings, ground_truth)
    print(f"\n=== {name} — {elapsed:.1f}s total, {exact}/12 exact ===")
    print(f"{'slot':<5}{'truth':<7}{'got':<7}{'conf':<7}note")
    for label in sorted(ground_truth):
        r = readings[label]
        mark = "" if r.count == ground_truth[label] else "  <-- MISS"
        print(f"{label:<5}{ground_truth[label]:<7}{r.count:<7}{r.confidence:<7.2f}{r.note[:40]}{mark}")


def main() -> None:
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "all"

    print("Warming up qwen2.5vl:7b (model should already be loaded; this is near-instant if so)...")
    ollama_client.warmup()

    img = capture.load_image(FIXTURE)
    boxes = grid.load_boxes()
    slot_items = load_slot_items()
    ground_truth = load_ground_truth()

    if which in ("all", "per_slot1"):
        readings, elapsed = run_per_slot(img, boxes, slot_items, concurrency=1)
        print_table("per-slot, sequential, upscaled+terse", readings, ground_truth, elapsed)

    if which in ("all", "per_slot2"):
        readings, elapsed = run_per_slot(img, boxes, slot_items, concurrency=2)
        print_table("per-slot, concurrency=2, upscaled+terse", readings, ground_truth, elapsed)

    if which in ("all", "per_slot3"):
        readings, elapsed = run_per_slot(img, boxes, slot_items, concurrency=3)
        print_table("per-slot, concurrency=3, upscaled+terse", readings, ground_truth, elapsed)

    if which in ("all", "row"):
        readings, elapsed = run_row(img, boxes, slot_items)
        print_table("row crops (3 calls)", readings, ground_truth, elapsed)

    if which in ("all", "full"):
        readings, elapsed = run_full(img, boxes, slot_items)
        print_table("full image (1 call)", readings, ground_truth, elapsed)


if __name__ == "__main__":
    main()
