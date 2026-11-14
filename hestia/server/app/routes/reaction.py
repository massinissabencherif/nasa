from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response
from sqlmodel import Session, select

from app.db import engine
from app.engines.reaction import (
    SessionConflict, SessionInput, current_protocol, save_session, session_detail, session_summary,
)
from app.models import CrewMember, ReactionSession
from app.routes.events import publish_event

router = APIRouter(tags=["reaction"])


def require_crew(session: Session, crew_id: int) -> None:
    if session.get(CrewMember, crew_id) is None:
        raise HTTPException(404, "crew member not found")


@router.get("/api/reaction/protocol")
def get_protocol() -> dict:
    return current_protocol()


@router.post("/api/crew/{crew_id}/reaction-sessions")
def create_session(crew_id: int, body: SessionInput, response: Response) -> dict:
    with Session(engine) as session:
        require_crew(session, crew_id)
        try:
            row, created = save_session(session, crew_id, body)
        except SessionConflict as error:
            raise HTTPException(409, str(error)) from error
        result = session_detail(session, row)
    if created:
        publish_event({"type": "reaction_session_saved", "crew_member_id": crew_id})
    response.status_code = 201 if created else 200
    return result


@router.get("/api/crew/{crew_id}/reaction-sessions")
def list_sessions(crew_id: int, limit: int = Query(30, ge=1, le=100),
                  offset: int = Query(0, ge=0), device_id: UUID | None = None,
                  protocol_version: str | None = Query(None, max_length=64)) -> list[dict]:
    with Session(engine) as session:
        require_crew(session, crew_id)
        query = select(ReactionSession).where(ReactionSession.crew_member_id == crew_id)
        if device_id:
            query = query.where(ReactionSession.device_id == str(device_id))
        if protocol_version:
            query = query.where(ReactionSession.protocol_version == protocol_version)
        rows = session.exec(query.order_by(ReactionSession.started_at.desc(), ReactionSession.id)
                            .offset(offset).limit(limit)).all()
        return [session_summary(session, row) for row in rows]


@router.get("/api/crew/{crew_id}/reaction-sessions/{session_id}")
def get_session(crew_id: int, session_id: UUID) -> dict:
    with Session(engine) as session:
        require_crew(session, crew_id)
        row = session.get(ReactionSession, str(session_id))
        if row is None or row.crew_member_id != crew_id:
            raise HTTPException(404, "reaction session not found")
        return session_detail(session, row)
