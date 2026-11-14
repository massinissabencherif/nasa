from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.models import MissionContext
from app.routes.events import publish_event

router = APIRouter(prefix="/api/context", tags=["context"])


class SetContextBody(BaseModel):
    type: str | None = None
    time_scale: float | None = None
    use_llm_advice: bool | None = None


@router.get("")
def get_active_context() -> MissionContext:
    with Session(engine) as session:
        context = session.exec(
            select(MissionContext).where(MissionContext.active == True)  # noqa: E712
        ).first()
        if context is None:
            raise HTTPException(404, "no active mission context — run /api/demo/reset")
        return context


@router.put("")
def set_active_context(body: SetContextBody) -> MissionContext:
    with Session(engine) as session:
        if body.type is not None:
            target = session.exec(
                select(MissionContext).where(MissionContext.type == body.type)
            ).first()
            if target is None:
                raise HTTPException(404, f"unknown context type '{body.type}'")
            previous = session.exec(
                select(MissionContext).where(MissionContext.active == True)  # noqa: E712
            ).first()
            if previous is not None and previous.id != target.id:
                # demo settings are global, not per context: carry them over
                target.time_scale = previous.time_scale
                target.use_llm_advice = previous.use_llm_advice
            for context in session.exec(select(MissionContext)):
                context.active = context.id == target.id
                session.add(context)
        else:
            target = session.exec(
                select(MissionContext).where(MissionContext.active == True)  # noqa: E712
            ).first()
            if target is None:
                raise HTTPException(404, "no active mission context — run /api/demo/reset")

        if body.time_scale is not None:
            if body.time_scale <= 0:
                raise HTTPException(400, "time_scale must be > 0")
            target.time_scale = body.time_scale
            session.add(target)

        if body.use_llm_advice is not None:
            target.use_llm_advice = body.use_llm_advice
            session.add(target)

        session.commit()
        session.refresh(target)
        publish_event({"type": "context_changed", "context": target.type})
        return target
