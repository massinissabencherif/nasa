from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.engines.status import crew_status
from app.models import CrewMember, Measurement

router = APIRouter(prefix="/api/crew", tags=["crew"])

CHECKIN_FIELDS = {
    "systolic_bp": "mmHg",
    "diastolic_bp": "mmHg",
    "heart_rate": "bpm",
    "glucose": "mg/dL",
    "temperature": "°C",
    "weight": "kg",
    "sleep_h": "h",
    "mood": "1-5",
    "exercise_min": "min",
}


class CheckinBody(BaseModel):
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    heart_rate: float | None = None
    glucose: float | None = None
    temperature: float | None = None
    weight: float | None = None
    sleep_h: float | None = None
    mood: float | None = None
    exercise_min: float | None = None
    symptoms: list[str] = []


@router.get("")
def list_crew() -> list[CrewMember]:
    with Session(engine) as session:
        return session.exec(select(CrewMember)).all()


@router.get("/{crew_id}/status")
def get_crew_status(crew_id: int) -> dict:
    with Session(engine) as session:
        if session.get(CrewMember, crew_id) is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        return crew_status(session, crew_id)


@router.get("/{crew_id}/measurements")
def get_measurements(
    crew_id: int, type: str | None = None, days: int = Query(default=90, ge=1, le=365)
) -> list[Measurement]:
    with Session(engine) as session:
        if session.get(CrewMember, crew_id) is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = select(Measurement).where(
            Measurement.crew_member_id == crew_id, Measurement.ts >= cutoff
        )
        if type:
            query = query.where(Measurement.type == type)
        return session.exec(query.order_by(Measurement.ts.desc())).all()


@router.post("/{crew_id}/checkin")
def checkin(crew_id: int, body: CheckinBody) -> list[Measurement]:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        ts = datetime.now(timezone.utc)
        created: list[Measurement] = []
        for field, unit in CHECKIN_FIELDS.items():
            value = getattr(body, field)
            if value is None:
                continue
            measurement = Measurement(
                ts=ts, crew_member_id=crew_id, type=field, value=value, unit=unit, source="manual"
            )
            session.add(measurement)
            created.append(measurement)
        for symptom in body.symptoms:
            measurement = Measurement(
                ts=ts, crew_member_id=crew_id, type="symptom", value=1, unit="count",
                source="manual", note=symptom,
            )
            session.add(measurement)
            created.append(measurement)
        session.commit()
        for m in created:
            session.refresh(m)
        return created


@router.post("/{crew_id}/meal")
def eat_meal(crew_id: int) -> dict:
    raise HTTPException(
        501, "meal proposal/consumption needs the pantry stock (M1, phase 2) — not implemented yet"
    )
