import io

import segno
from fastapi import APIRouter
from fastapi.responses import Response

from vision import ollama_client

router = APIRouter(prefix="/api/station", tags=["station"])


def _crew_url() -> str:
    from app.main import PORT, lan_ip

    return f"http://{lan_ip()}:{PORT}/crew/"


@router.get("/info")
def station_info() -> dict:
    from app.main import PORT, lan_ip

    ip = lan_ip()
    return {
        "lan_ip": ip,
        "port": PORT,
        "api_url": f"http://{ip}:{PORT}",
        "crew_url": _crew_url(),
        "on_lan": ip != "127.0.0.1",
        "ollama": ollama_client.status(),
    }


@router.get("/qr.svg")
def crew_qr() -> Response:
    """QR code of the crew-app URL, generated locally (no external service)."""
    qr = segno.make(_crew_url(), error="m")
    buffer = io.BytesIO()
    qr.save(buffer, kind="svg", scale=6, border=2, dark="#0e141b", light="#eaf0f5")
    return Response(buffer.getvalue(), media_type="image/svg+xml", headers={"Cache-Control": "no-store"})
