import json

import httpx

OLLAMA_URL = "http://localhost:11434"
VISION_MODEL = "qwen2.5vl:7b"
KEEP_ALIVE = "30m"


class OllamaUnavailable(RuntimeError):
    """Ollama is not reachable, or the model is not installed."""


def generate(
    prompt: str,
    images_b64: list[str] | None = None,
    timeout: float = 60.0,
    json_mode: bool = True,
    schema: dict | None = None,
) -> dict:
    payload = {
        "model": VISION_MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": KEEP_ALIVE,
        "options": {"temperature": 0},
    }
    if schema is not None:
        payload["format"] = schema  # structured output: the reply must match this JSON schema
    elif json_mode:
        payload["format"] = "json"
    if images_b64:
        payload["images"] = images_b64
    try:
        resp = httpx.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=timeout)
        resp.raise_for_status()
    except httpx.ConnectError as exc:
        raise OllamaUnavailable(
            "Ollama is not running on localhost:11434. Start it (`ollama serve`) or use the mock scan."
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise OllamaUnavailable(
            f"Ollama refused the request ({exc.response.status_code}). Is `{VISION_MODEL}` pulled?"
        ) from exc
    return resp.json()


def generate_stream(
    prompt: str,
    images_b64: list[str],
    schema: dict,
    on_text=None,
    timeout: float = 120.0,
) -> str:
    """Same request as generate() but streamed, so the caller can report
    progress while the answer is being written. Returns the full text."""
    payload = {
        "model": VISION_MODEL,
        "prompt": prompt,
        "images": images_b64,
        "stream": True,
        "keep_alive": KEEP_ALIVE,
        "format": schema,
        "options": {"temperature": 0},
    }
    text = ""
    try:
        with httpx.stream("POST", f"{OLLAMA_URL}/api/generate", json=payload, timeout=timeout) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                text += json.loads(line).get("response", "")
                if on_text:
                    on_text(text)
    except httpx.ConnectError as exc:
        raise OllamaUnavailable(
            "Ollama is not running on localhost:11434. Start it (`ollama serve`) or use the mock scan."
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise OllamaUnavailable(
            f"Ollama refused the request ({exc.response.status_code}). Is `{VISION_MODEL}` pulled?"
        ) from exc
    except httpx.TimeoutException as exc:
        raise OllamaUnavailable("Ollama took too long to answer. Use the mock scan and retry later.") from exc
    return text


def status() -> dict:
    """Cheap health probe for the station UI: is Ollama up, is the model in RAM."""
    try:
        tags = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=1.5).json()
        loaded = httpx.get(f"{OLLAMA_URL}/api/ps", timeout=1.5).json()
    except (httpx.HTTPError, ValueError):
        return {"running": False, "model": VISION_MODEL, "installed": False, "loaded": False}
    installed = any(m.get("name") == VISION_MODEL for m in tags.get("models", []))
    in_ram = [m.get("name") for m in loaded.get("models", [])]
    return {
        "running": True,
        "model": VISION_MODEL,
        "installed": installed,
        "loaded": VISION_MODEL in in_ram,
        "models_in_ram": in_ram,
    }


def warmup() -> None:
    """Load the vision model into RAM so the first real scan isn't ~48s cold.
    Never call this alongside loading any other model (PROMPT_ADDENDUM.md #2)."""
    try:
        generate("Reply with the single word: ready.", images_b64=None, timeout=90.0, json_mode=False)
    except (httpx.HTTPError, OllamaUnavailable):
        pass  # Ollama not running — scans will surface the error themselves
