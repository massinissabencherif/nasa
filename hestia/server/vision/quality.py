"""Checks done before the model is asked anything. Classical image
measurements, almost free: a blurred or badly lit photo gets a plain warning
instead of a doubtful count. The limits are assumptions chosen on test
images, not validated values: they warn, they never block a scan."""

import cv2
import numpy as np

# variance of the Laplacian below this: the picture is probably blurred
BLUR_LIMIT = 60.0
DARK_LIMIT = 45.0      # mean grey level, 0-255
BRIGHT_LIMIT = 215.0
CLIPPED_SHARE = 0.25   # share of pixels that are pure black or pure white


def sharpness(image: np.ndarray) -> float:
    """Variance of the Laplacian: higher means sharper edges."""
    grey = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    return float(cv2.Laplacian(grey, cv2.CV_64F).var())


def sharpest(frames: list[np.ndarray]) -> np.ndarray:
    """The sharpest frame of a short burst (a hand-held or just-moved camera)."""
    if not frames:
        raise ValueError("no frame to choose from")
    return max(frames, key=sharpness)


def assess(image: np.ndarray) -> list[str]:
    """Plain warnings about the photo itself; an empty list means none."""
    grey = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    warnings: list[str] = []
    if sharpness(image) < BLUR_LIMIT:
        warnings.append("The photo looks blurred: hold the camera still and scan again.")
    mean = float(grey.mean())
    if mean < DARK_LIMIT:
        warnings.append("The photo is very dark: add light and scan again.")
    elif mean > BRIGHT_LIMIT:
        warnings.append("The photo is very bright: reduce glare and scan again.")
    clipped = float(((grey <= 2) | (grey >= 253)).mean())
    if clipped > CLIPPED_SHARE:
        warnings.append("Large areas are pure black or pure white: details may be lost.")
    return warnings
