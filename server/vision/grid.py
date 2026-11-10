import base64
import json
from pathlib import Path

import cv2
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
GRID_PATH = DATA_DIR / "shelf_grid.json"

Box = tuple[float, float, float, float]  # x0, y0, x1, y1, normalised 0-1


def load_boxes() -> dict[str, Box]:
    with open(GRID_PATH) as f:
        data = json.load(f)
    return {label: tuple(box) for label, box in data["boxes"].items()}


def save_boxes(boxes: dict[str, Box]) -> None:
    with open(GRID_PATH) as f:
        data = json.load(f)
    data["boxes"] = {label: list(box) for label, box in boxes.items()}
    with open(GRID_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def crop_box(img: np.ndarray, box: Box) -> np.ndarray:
    h, w = img.shape[:2]
    x0, y0, x1, y1 = box
    return img[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]


def row_box(boxes: dict[str, Box], row_labels: list[str]) -> Box:
    cells = [boxes[label] for label in row_labels]
    x0 = min(c[0] for c in cells)
    y0 = min(c[1] for c in cells)
    x1 = max(c[2] for c in cells)
    y1 = max(c[3] for c in cells)
    return (x0, y0, x1, y1)


ROWS: dict[str, list[str]] = {
    "A": ["A1", "A2", "A3", "A4"],
    "B": ["B1", "B2", "B3", "B4"],
    "C": ["C1", "C2", "C3", "C4"],
}


def encode_png_base64(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise RuntimeError("failed to encode crop as PNG")
    return base64.b64encode(buf).decode("ascii")
