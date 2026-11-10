from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.models import MissionContext

router = APIRouter(prefix="/api/context", tags=["context"])


class SetContextBody(BaseModel):
    type: str


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
        target = session.exec(
            select(MissionContext).where(MissionContext.type == body.type)
        ).first()
        if target is None:
            raise HTTPException(404, f"unknown context type '{body.type}'")
        for context in session.exec(select(MissionContext)):
            context.active = context.id == target.id
            session.add(context)
        session.commit()
        session.refresh(target)
        return target
