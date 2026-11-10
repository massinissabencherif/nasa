import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/events", tags=["events"])

_subscribers: list[asyncio.Queue] = []


def publish_event(event: dict) -> None:
    for queue in _subscribers:
        queue.put_nowait(event)


async def _stream():
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers.append(queue)
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
    finally:
        _subscribers.remove(queue)


@router.get("")
async def events() -> StreamingResponse:
    return StreamingResponse(_stream(), media_type="text/event-stream")
