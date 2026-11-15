from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.engines.earth_link import (
    build_update,
    crew_member_of,
    dont_wait_rules,
    ensure_plan,
    onboard_now,
    payload_of,
    send_update,
)
from app.models import EarthMessage, OnboardStep
from app.routes.events import publish_event

router = APIRouter(prefix="/api/earth", tags=["earth"])


def _status(message: EarthMessage, now: datetime) -> str:
    if now >= message.reply_ts:
        return "replied"
    if now >= message.deliver_ts:
        return "delivered"
    return "queued"


def _out(session: Session, m: EarthMessage, now: datetime) -> dict:
    status = _status(m, now)
    payload = payload_of(m)
    crew_id = crew_member_of(session, m)
    is_update = payload.get("kind") == "update"
    findings = payload.get("findings", [])
    return {
        "id": m.id,
        "created_ts": m.created_ts,
        "deliver_ts": m.deliver_ts,
        "reply_ts": m.reply_ts,
        "payload": m.payload,
        "reply_payload": m.reply_payload if status == "replied" else None,
        "status": status,
        "alert_id": m.alert_id,
        "kind": "update" if is_update else "report",
        "parent_id": payload.get("parent_id"),
        "crew_member_id": crew_id,
        # what is true on board now, next to what Earth will read
        "onboard_now": onboard_now(session, crew_id, findings) if crew_id is not None and not is_update else [],
        "dont_wait": dont_wait_rules(session, m, crew_id) if not is_update else None,
        "plan": [
            {"id": st.id, "label": st.label, "due_ts": st.due_ts, "done_ts": st.done_ts}
            for st in (ensure_plan(session, m) if not is_update else [])
        ],
    }


@router.get("/messages")
def list_messages() -> list[dict]:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        messages = session.exec(select(EarthMessage).order_by(EarthMessage.created_ts.desc())).all()
        out = [_out(session, m, now) for m in messages]
        session.commit()  # plans created on first read
    return out


class StepBody(BaseModel):
    done: bool


@router.post("/steps/{step_id}")
def tick_step(step_id: int, body: StepBody) -> dict:
    with Session(engine) as session:
        step = session.get(OnboardStep, step_id)
        if step is None:
            raise HTTPException(404, "step not found")
        step.done_ts = datetime.now(timezone.utc) if body.done else None
        session.add(step)
        session.commit()
        session.refresh(step)
        result = {"id": step.id, "label": step.label, "due_ts": step.due_ts, "done_ts": step.done_ts}
    publish_event({"type": "earth_changed"})
    return result


def _parent(session: Session, message_id: int) -> EarthMessage:
    parent = session.get(EarthMessage, message_id)
    if parent is None or payload_of(parent).get("kind") == "update":
        raise HTTPException(404, "report not found")
    return parent


@router.get("/messages/{message_id}/update")
def preview_update(message_id: int) -> dict:
    """The exact text an update would carry, before the crew decides to send it."""
    with Session(engine) as session:
        payload = build_update(session, _parent(session, message_id))
        session.commit()
    if payload is None:
        raise HTTPException(409, "no crew member for this report")
    return payload


@router.post("/messages/{message_id}/update", status_code=201)
def post_update(message_id: int) -> dict:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        message = send_update(session, _parent(session, message_id), now)
        if message is None:
            raise HTTPException(409, "no crew member for this report")
        session.commit()
        session.refresh(message)
        out = _out(session, message, now)
    publish_event({"type": "earth_changed"})
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
        for step in session.exec(select(OnboardStep)).all():
            # the onboard plan ages with its report, so "measure again" comes due too
            if step.due_ts is not None:
                step.due_ts -= shift
            if step.done_ts is not None:
                step.done_ts -= shift
            session.add(step)
        session.commit()
    return {"advanced_seconds": seconds}
