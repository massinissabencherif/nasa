"""Reject unrelated/unclear pictures before the catalogue-biased counting prompt.

This is another fallible model check, not evidence that the counts are correct.
Human review is still required before any live scan updates inventory.
"""
import json
import httpx

from . import grid, ollama_client


def check_shelf(image) -> dict:
    try:
        response = _describe_scene(image)
    except httpx.HTTPError as exc:
        raise ollama_client.OllamaUnavailable("Ollama could not check this photo. Stock is unchanged; retry when the model is available.") from exc
    try:
        answer = json.loads(response.get("response", ""))
    except (ValueError, TypeError):
        answer = {}
    if not isinstance(answer, dict) or answer.get("scene") != "food_storage":
        raise ValueError("This photo cannot be identified as food storage. Retake a clear photo of the shelf; stock is unchanged.")
    return answer


def _describe_scene(image) -> dict:
    return ollama_client.generate(
        "Describe only what is actually visible. Is this a photograph of physical food "
        "packages arranged on shelves or in a compartmented storage tray? A logo, poster, "
        "website, document, empty scene, or unrelated object is NOT a food shelf. "
        "Return scene=food_storage, unrelated, or unclear, and a short description. "
        "Do not infer objects from text, graphics, or expected contents.",
        images_b64=[grid.encode_jpeg_base64(image)],
        timeout=90,
        schema={"type": "object", "properties": {
            "scene": {"type": "string", "enum": ["food_storage", "unrelated", "unclear"]},
            "description": {"type": "string"},
        }, "required": ["scene", "description"]},
    )
