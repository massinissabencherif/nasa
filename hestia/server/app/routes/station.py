import io

import segno
from fastapi import APIRouter, Request
from fastapi.responses import Response

from vision import ollama_client

router = APIRouter(prefix="/api/station", tags=["station"])


def _crew_url(secure: bool = False, port: int | None = None) -> str:
    from app import main

    if secure:
        return f"https://{main.lan_ip()}:{main.HTTPS_PORT}/crew/"
    return f"http://{main.lan_ip()}:{port or main.PORT}/crew/"


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
        "on_lan": ip != "127.0.0.1",
        "ollama": ollama_client.status(),
    }


@router.get("/qr.svg")
def crew_qr(request: Request, secure: bool = False) -> Response:
    """QR code of the crew-app URL, generated locally (no external service)."""
    port = request.url.port if request.url.scheme == "http" else None
    qr = segno.make(_crew_url(secure, port), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=6, border=2, dark="#0e141b", light="#eaf0f5")
    return Response(buffer.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "no-store"})
