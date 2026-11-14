from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlmodel import Session, select

from app.db import engine
from app.models import EarthMessage

router = APIRouter(prefix="/api/earth", tags=["earth"])


def _status(message: EarthMessage, now: datetime) -> str:
    if now >= message.reply_ts:
        return "replied"
    if now >= message.deliver_ts:
        return "delivered"
    return "queued"


@router.get("/messages")
def list_messages() -> list[dict]:
    with Session(engine) as session:
        messages = session.exec(select(EarthMessage).order_by(EarthMessage.created_ts.desc())).all()
    now = datetime.now(timezone.utc)
    out = []
    for m in messages:
        status = _status(m, now)
        out.append({
            "id": m.id,
            "created_ts": m.created_ts,
            "deliver_ts": m.deliver_ts,
            "reply_ts": m.reply_ts,
            "payload": m.payload,
            "reply_payload": m.reply_payload if status == "replied" else None,
            "status": status,
            "alert_id": m.alert_id,
        })
    return out


@router.post("/advance")
def advance_time(seconds: int = Query(default=300, ge=1, le=86400)) -> dict:
    with Session(engine) as session:
        messages = session.exec(select(EarthMessage)).all()
        shift = timedelta(seconds=seconds)
        for m in messages:
            # skipping ahead ages the whole message: its sending time moves too,
            # otherwise a reply could be shown as received before the report left
            m.created_ts -= shift
            m.deliver_ts -= shift
            m.reply_ts -= shift
            session.add(m)
        session.commit()
    return {"advanced_seconds": seconds}
