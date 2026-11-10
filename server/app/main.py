import asyncio
import socket
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routes import alerts, context, crew, demo, earth, events, forecast, pantry, reference
from app.seed import is_seeded, reset_and_seed
from vision.ollama_client import warmup


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if not is_seeded():
        reset_and_seed()
    asyncio.get_running_loop().run_in_executor(None, warmup)
    yield


app = FastAPI(title="HESTIA server", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(context.router)
app.include_router(crew.router)
app.include_router(pantry.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(earth.router)
app.include_router(demo.router)
app.include_router(events.router)
app.include_router(reference.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "hestia-server"}


def lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main() -> None:
    ip = lan_ip()
    print(f"HESTIA server starting — LAN IP: {ip}:8000 (station & crew app should point here)")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
