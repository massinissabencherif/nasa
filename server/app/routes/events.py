import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/events", tags=["events"])

_subscribers: list[tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = []


def publish_event(event: dict) -> None:
    """Safe to call from any thread: sync routes run in FastAPI's threadpool,
    while the queues belong to the event loop, so hand each event over with
    call_soon_threadsafe (a bare put_nowait would not wake the loop and the
    event would sit there until the next heartbeat)."""
    for loop, queue in list(_subscribers):
        try:
            loop.call_soon_threadsafe(queue.put_nowait, event)
        except RuntimeError:
            pass  # loop already closed (server shutting down)


async def _stream():
    queue: asyncio.Queue = asyncio.Queue()
    entry = (asyncio.get_running_loop(), queue)
    _subscribers.append(entry)
    try:
        yield ": connected\n\n"
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
                yield f"data: {json.dumps(event, default=str)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        _subscribers.remove(entry)


@router.get("")
async def events() -> StreamingResponse:
    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
