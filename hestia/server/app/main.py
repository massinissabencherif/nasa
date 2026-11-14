import asyncio
import os
import shutil
import socket
import subprocess
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.routes import alerts, context, crew, demo, earth, events, forecast, pantry, reaction, reference, station
from app.seed import is_seeded, reset_and_seed
from vision.ollama_client import warmup

PORT = int(os.environ.get("HESTIA_PORT", "8000"))
HTTPS_PORT = int(os.environ.get("HESTIA_HTTPS_PORT", "8443"))
CERT_DIR = Path(__file__).resolve().parent.parent / "certs"  # git-ignored
https_enabled = False  # set by main() once the HTTPS listener is started
CREW_DIST = Path(__file__).resolve().parent.parent.parent / "apps" / "crew" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not is_seeded():
        reset_and_seed()
    # Load the vision model now, in the background, so no cold load happens during a scan.
    asyncio.get_running_loop().run_in_executor(None, warmup)
    yield


app = FastAPI(title="HESTIA server", version="0.1.0", lifespan=lifespan)

# Open CORS: the station and the crew phones reach this API from other origins
# on the isolated base LAN. There is no internet route and no credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (context, crew, pantry, forecast, alerts, earth, demo, events, reference, station, reaction):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "hestia-server"}


# The built crew app is served by the station itself, so a phone only needs
# http://<station-ip>:8000/crew/ — no second dev server, nothing from the internet.
if CREW_DIST.is_dir():
    app.mount("/crew", StaticFiles(directory=CREW_DIST, html=True), name="crew")
else:
    @app.get("/crew")
    @app.get("/crew/")
    def crew_not_built() -> dict:
        return {"detail": "crew app not built yet: run `pnpm build:crew` (or `make build`)"}


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse("/crew/")


def lan_ip() -> str:
    """Local address of the interface used for LAN traffic. A UDP connect sends
    no packet; the target is a private, non-routable address so this works (and
    stays honest) with no internet at all."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def ensure_certificate(ip: str) -> tuple[Path, Path] | None:
    """Self-signed certificate for this machine's LAN address, made locally
    with openssl. Phone browsers only allow a live camera viewfinder on a
    secure page, so the crew app is also served over HTTPS. The phone shows a
    one-time warning because nobody vouches for the certificate; the traffic
    never leaves the base network."""
    key, cert = CERT_DIR / f"hestia-{ip}.key", CERT_DIR / f"hestia-{ip}.crt"
    if key.is_file() and cert.is_file():
        return key, cert
    if shutil.which("openssl") is None:
        return None
    CERT_DIR.mkdir(exist_ok=True)
    try:
        subprocess.run(
            [
                "openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "365",
                "-keyout", str(key), "-out", str(cert), "-subj", "/CN=HESTIA station",
                "-addext", f"subjectAltName=IP:{ip},IP:127.0.0.1,DNS:localhost",
                "-addext", "extendedKeyUsage=serverAuth",
            ],
            check=True, capture_output=True, timeout=30,
        )
    except (subprocess.SubprocessError, OSError):
        return None
    return key, cert


def start_https(ip: str) -> bool:
    """Second listener, same app, in a background thread. Lifespan is off
    there: the database and the model warm-up belong to the main listener."""
    files = ensure_certificate(ip)
    if files is None:
        return False
    key, cert = files
    config = uvicorn.Config(
        app, host="0.0.0.0", port=HTTPS_PORT, ssl_keyfile=str(key), ssl_certfile=str(cert),
        lifespan="off", log_level="warning",
    )
    threading.Thread(target=uvicorn.Server(config).run, daemon=True, name="hestia-https").start()
    return True


def main() -> None:
    ip = lan_ip()
    global https_enabled
    reload = os.environ.get("HESTIA_RELOAD") == "1"
    print(f"HESTIA server — API http://{ip}:{PORT}  ·  crew app http://{ip}:{PORT}/crew/")
    if reload:
        uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
        return
    https_enabled = start_https(ip)
    if https_enabled:
        print(f"Crew app with live camera (HTTPS, one-time certificate warning): https://{ip}:{HTTPS_PORT}/crew/")
    uvicorn.run(app, host="0.0.0.0", port=PORT)


if __name__ == "__main__":
    main()
