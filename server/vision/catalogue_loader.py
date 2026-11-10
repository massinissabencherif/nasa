import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_slot_items() -> dict[str, dict | None]:
    with open(DATA_DIR / "food_catalogue.json") as f:
        catalogue = json.load(f)
    items_by_key = {item["key"]: item for item in catalogue["items"]}
    out = {}
    for slot in catalogue["shelf_grid"]:
        out[slot["label"]] = items_by_key.get(slot["item"]) if slot["item"] else None
    return out


def load_ground_truth() -> dict[str, int]:
    with open(DATA_DIR / "food_catalogue.json") as f:
        catalogue = json.load(f)
    return {s["label"]: s["ground_truth_count"] for s in catalogue["shelf_grid"]}
