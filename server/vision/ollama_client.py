import httpx

OLLAMA_URL = "http://localhost:11434"
VISION_MODEL = "qwen2.5vl:7b"
KEEP_ALIVE = "30m"


def generate(prompt: str, images_b64: list[str] | None = None, timeout: float = 60.0) -> dict:
    payload = {
        "model": VISION_MODEL,
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "keep_alive": KEEP_ALIVE,
        "options": {"temperature": 0},
    }
    if images_b64:
        payload["images"] = images_b64
    resp = httpx.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def warmup() -> None:
    """Load the vision model into RAM so the first real scan isn't ~48s cold.
    Never call this alongside loading any other model (PROMPT_ADDENDUM.md #2)."""
    try:
        generate("Reply with the single word: ready.", images_b64=None, timeout=90.0)
    except httpx.HTTPError:
        pass  # Ollama not running — scans will surface the error themselves
