import cv2
import numpy as np

MAX_WIDTH = 1280


def downscale(img: np.ndarray, max_width: int = MAX_WIDTH) -> np.ndarray:
    h, w = img.shape[:2]
    if w <= max_width:
        return img
    scale = max_width / w
    return cv2.resize(img, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)


def load_image(path: str) -> np.ndarray:
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(f"could not read image at '{path}'")
    return downscale(img)


BURST_FRAMES = 8


def capture_from_webcam(camera_index: int = 0, frames: int = BURST_FRAMES) -> np.ndarray:
    """Grab a short burst and keep the sharpest frame. A live camera is read
    as one chosen picture: the model is never called on every video frame."""
    from .quality import sharpest

    cap = cv2.VideoCapture(camera_index)
    try:
        if not cap.isOpened():
            raise RuntimeError(f"could not open camera index {camera_index}")
        burst = []
        for _ in range(max(1, frames)):
            ok, frame = cap.read()
            if ok and frame is not None:
                burst.append(frame)
        if not burst:
            raise RuntimeError(f"could not read a frame from camera index {camera_index}")
        return downscale(sharpest(burst))
    finally:
        cap.release()
