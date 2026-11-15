import io

import segno
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from vision import ollama_client

router = APIRouter(prefix="/api/station", tags=["station"])


# Where a scanned code lands in the crew app. "pantry_photo" opens the shelf
# photo sheet directly, without choosing a crew profile first.
CREW_TARGETS = {"home": "", "pantry_photo": "#/pantry?photo=1"}


def _crew_url(secure: bool = False, port: int | None = None, target: str = "home") -> str:
    from app import main

    suffix = CREW_TARGETS.get(target, "")
    if secure:
        return f"https://{main.lan_ip()}:{main.HTTPS_PORT}/crew/{suffix}"
    return f"http://{main.lan_ip()}:{port or main.PORT}/crew/{suffix}"


@router.get("/info")
def station_info(request: Request) -> dict:
    from app import main

    ip = main.lan_ip()
    port = request.url.port if request.url.scheme == "http" else main.PORT
    port = port or main.PORT
    return {
        "lan_ip": ip,
        "port": port,
        "api_url": f"http://{ip}:{port}",
        "crew_url": _crew_url(port=port),
        # HTTPS copy of the crew app: needed for the in-page camera viewfinder on phones
        "crew_url_secure": _crew_url(secure=True) if main.https_enabled else None,
        "crew_photo_url": _crew_url(port=port, target="pantry_photo"),
        "on_lan": ip != "127.0.0.1",
        "ollama": ollama_client.status(),
    }


@router.get("/qr.svg")
def crew_qr(request: Request, secure: bool = False, target: str = "home") -> Response:
    """QR code of the crew-app URL, generated locally (no external service)."""
    if target not in CREW_TARGETS:
        raise HTTPException(400, "unknown target")
    port = request.url.port if request.url.scheme == "http" else None
    qr = segno.make(_crew_url(secure, port, target), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=6, border=2, dark="#0e141b", light="#eaf0f5")
    return Response(buffer.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "no-store"})
