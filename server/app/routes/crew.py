from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.engines.alerts import evaluate_and_alert
from app.engines.nutrition import available_items, daily_need, kcal_eaten_today
from app.engines.status import crew_status
from app.models import ConsumptionEvent, CrewMember, Measurement, MissionContext
from app.routes.events import publish_event

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


@router.get("/{crew_id}/latest")
def get_latest_measurements(crew_id: int) -> dict:
    with Session(engine) as session:
        if session.get(CrewMember, crew_id) is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        rows = session.exec(
            select(Measurement)
            .where(Measurement.crew_member_id == crew_id)
            .order_by(Measurement.ts.desc())
        ).all()
        latest: dict[str, dict] = {}
        for row in rows:
            if row.type not in latest:
                latest[row.type] = {"value": row.value, "unit": row.unit, "ts": row.ts}
        return latest


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

        active_context = session.exec(
            select(MissionContext).where(MissionContext.active == True)  # noqa: E712
        ).first()
        use_llm = bool(active_context and active_context.use_llm_advice)
        new_alerts = evaluate_and_alert(session, crew_id, use_llm=use_llm)
        session.commit()
        for alert in new_alerts:
            publish_event({
                "type": "alert_created",
                "crew_member_id": crew_id,
                "indicator": alert.indicator,
                "level": alert.level,
            })
        return created


@router.get("/{crew_id}/meal")
def propose_meal(crew_id: int) -> dict:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        need = daily_need(crew)
        eaten = kcal_eaten_today(session, crew_id, today_start)
        return {
            "daily_need_kcal": round(need, 1),
            "kcal_eaten_today": round(eaten, 1),
            "kcal_remaining_today": round(max(0.0, need - eaten), 1),
            "available": [
                {
                    "food_item_id": item.food_item_id,
                    "name": item.name,
                    "kcal": item.kcal,
                    "protein_g": item.protein_g,
                    "carbs_g": item.carbs_g,
                    "fat_g": item.fat_g,
                    "available_count": item.available_count,
                }
                for item in available_items(session)
            ],
        }


class MealBody(BaseModel):
    food_item_id: int
    qty: int = 1


@router.post("/{crew_id}/meal")
def eat_meal(crew_id: int, body: MealBody) -> ConsumptionEvent:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        available = {item.food_item_id: item for item in available_items(session)}
        item = available.get(body.food_item_id)
        if item is None or item.available_count < body.qty:
            raise HTTPException(400, "that item isn't available in the current stock")
        event = ConsumptionEvent(
            ts=datetime.now(timezone.utc),
            food_item_id=body.food_item_id,
            qty=-body.qty,
            crew_member_id=crew_id,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        publish_event({"type": "meal_logged", "crew_member_id": crew_id, "food_item_id": body.food_item_id})
        return event
