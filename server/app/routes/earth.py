from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.db import engine
from app.models import EarthMessage

router = APIRouter(prefix="/api/earth", tags=["earth"])


@router.get("/messages")
def list_messages() -> list[EarthMessage]:
    with Session(engine) as session:
        return session.exec(select(EarthMessage).order_by(EarthMessage.created_ts.desc())).all()


@router.post("/advance")
def advance_time() -> dict:
    raise HTTPException(
        501, "demo time-skip / simulated ground reply is phase 6 — not implemented yet"
    )
