import io

import segno
from fastapi import APIRouter
from fastapi.responses import Response

from vision import ollama_client

router = APIRouter(prefix="/api/station", tags=["station"])


def _crew_url(secure: bool = False) -> str:
    from app import main

    if secure:
        return f"https://{main.lan_ip()}:{main.HTTPS_PORT}/crew/"
    return f"http://{main.lan_ip()}:{main.PORT}/crew/"


@router.get("/info")
def station_info() -> dict:
    from app import main

    ip = main.lan_ip()
    return {
        "lan_ip": ip,
        "port": main.PORT,
        "api_url": f"http://{ip}:{main.PORT}",
        "crew_url": _crew_url(),
        # HTTPS copy of the crew app: needed for the in-page camera viewfinder on phones
        "crew_url_secure": _crew_url(secure=True) if main.https_enabled else None,
        "on_lan": ip != "127.0.0.1",
        "ollama": ollama_client.status(),
    }


@router.get("/qr.svg")
def crew_qr(secure: bool = False) -> Response:
    """QR code of the crew-app URL, generated locally (no external service)."""
    qr = segno.make(_crew_url(secure), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=6, border=2, dark="#0e141b", light="#eaf0f5")
    return Response(buffer.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "no-store"})
