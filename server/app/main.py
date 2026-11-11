import asyncio
import os
import socket
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.routes import alerts, context, crew, demo, earth, events, forecast, pantry, reference, station
from app.seed import is_seeded, reset_and_seed
from vision.ollama_client import warmup

PORT = int(os.environ.get("HESTIA_PORT", "8000"))
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

for module in (context, crew, pantry, forecast, alerts, earth, demo, events, reference, station):
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


def main() -> None:
    ip = lan_ip()
    print(f"HESTIA server — API http://{ip}:{PORT}  ·  crew app http://{ip}:{PORT}/crew/")
    uvicorn.run(
        "app.main:app", host="0.0.0.0", port=PORT,
        reload=os.environ.get("HESTIA_RELOAD") == "1",
    )


if __name__ == "__main__":
    main()
