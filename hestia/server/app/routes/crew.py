from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, StrictInt
from sqlmodel import Session, select

from app.db import engine
from app.engines.checkin import record_checkin
from app.engines.gamification import gamification_report, register_meal
from app.engines.nutrition import available_items, daily_need, kcal_eaten_today, consumed_today
from app.engines.status import crew_status
from app.engines.meal_log import cancel_meal
from app.models import Alert, ConsumptionEvent, CrewMember, Measurement, MissionContext
from app.routes.events import publish_event

router = APIRouter(prefix="/api/crew", tags=["crew"])

class CheckinBody(BaseModel):
    systolic_bp: float | None = Field(default=None, ge=40, le=260)
    diastolic_bp: float | None = Field(default=None, ge=20, le=160)
    heart_rate: float | None = Field(default=None, ge=20, le=240)
    glucose: float | None = Field(default=None, ge=20, le=600)
    temperature: float | None = Field(default=None, ge=30, le=43)
    weight: float | None = Field(default=None, ge=30, le=200)
    sleep_h: float | None = Field(default=None, ge=0, le=24)
    mood: float | None = Field(default=None, ge=1, le=5)
    exercise_min: float | None = Field(default=None, ge=0, le=600)
    reaction_ms: float | None = Field(default=None, ge=100, le=3000)
    symptoms: list[str] = Field(default_factory=list, max_length=12)


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


def _alert_summary(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "indicator": alert.indicator,
        "level": alert.level,
        "message": alert.message,
        "sent_to_earth": alert.sent_to_earth,
    }


@router.post("/{crew_id}/checkin")
def checkin(crew_id: int, body: CheckinBody) -> dict:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        values = body.model_dump(exclude={"symptoms"})
        if all(v is None for v in values.values()) and not body.symptoms:
            raise HTTPException(400, "empty check-in: fill in at least one field")
        symptoms = [s.strip()[:40] for s in body.symptoms if s.strip()]
        measurements, alerts = record_checkin(session, crew, values, symptoms)
        result = {
            "saved": len(measurements),
            "alerts": [_alert_summary(a) for a in alerts],
            "status": crew_status(session, crew_id),
        }
    publish_event({"type": "checkin", "crew_member_id": crew_id})
    for alert in result["alerts"]:
        publish_event({
            "type": "alert_created", "crew_member_id": crew_id,
            "indicator": alert["indicator"], "level": alert["level"],
        })
    return result


@router.get("/{crew_id}/gamification")
def get_gamification(crew_id: int) -> dict:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        return gamification_report(session, crew)


CONTEXT_REMINDERS: dict[str, str] = {
    "mars_base": "Earth is {delay} away one way: report symptoms early, the crew is the first responder.",
    "mars_transit": "Deep-space radiation is at its highest in transit: know your shelter spot before a solar event.",
    "moon_base": "Lunar dust irritates eyes and airways: log any congestion or eye irritation after an EVA.",
    "iss": "Microgravity fluid shift: log any change in vision, however small (SANS watch).",
}


def _delay_text(seconds: int) -> str:
    return f"{seconds} s" if seconds < 60 else f"{round(seconds / 60)} min"


@router.get("/{crew_id}/reminders")
def get_reminders(crew_id: int) -> list[dict]:
    with Session(engine) as session:
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today = session.exec(
            select(Measurement).where(
                Measurement.crew_member_id == crew_id, Measurement.ts >= day_start
            )
        ).all()
        types_today = {m.type for m in today}
        # the latest check-in of the day is the day's total (demo_rules.json)
        exercise_rows = sorted((m for m in today if m.type == "exercise_min"), key=lambda m: (m.ts, m.id))
        exercise_today = exercise_rows[-1].value if exercise_rows else 0
        vitals = {"systolic_bp", "heart_rate", "temperature"}
        context = session.exec(
            select(MissionContext).where(MissionContext.active == True)  # noqa: E712
        ).first()
        need = daily_need(crew)
        eaten = kcal_eaten_today(session, crew_id, day_start)

    reminders = [
        {"key": "measurements", "label": "Daily measurements",
         "detail": "Blood pressure, heart rate and temperature in today's check-in.",
         "done": vitals <= types_today},
        {"key": "exercise", "label": "Resistive exercise, 30 min or more",
         "detail": "The main countermeasure against bone and muscle loss in altered gravity.",
         "done": exercise_today >= 30},
        {"key": "meal", "label": "Log your meals",
         "detail": f"{round(eaten)} of {round(need)} kcal logged today.",
         "done": need > 0 and eaten >= 0.8 * need},
        {"key": "hydration", "label": "Drink water on a schedule",
         "detail": "Thirst is a poor guide in altered gravity: aim for a pouch every 2-3 hours.",
         "done": False},
    ]
    if context is not None and context.type in CONTEXT_REMINDERS:
        reminders.append({
            "key": "context", "label": context.label,
            "detail": CONTEXT_REMINDERS[context.type].format(delay=_delay_text(context.delay_s)),
            "done": False,
        })
    return reminders


def _suggest_meal(items, target_kcal: float) -> list[dict]:
    """Greedy pick for one meal: start with the most protein-dense item, then
    add whatever brings the total closest to the target without overshooting by
    more than 15%. One unit per item, at most 3 items."""
    candidates = [i for i in items if i.kcal > 0 and i.kcal <= target_kcal * 1.15]
    if not candidates:
        return []
    picked = [max(candidates, key=lambda i: i.protein_g / i.kcal)]
    total = picked[0].kcal
    while len(picked) < 3:
        rest = [i for i in candidates if i not in picked and total + i.kcal <= target_kcal * 1.15]
        if not rest or total >= target_kcal * 0.85:
            break
        best = min(rest, key=lambda i: abs(target_kcal - (total + i.kcal)))
        picked.append(best)
        total += best.kcal
    return [{"food_item_id": i.food_item_id, "name": i.name, "kcal": i.kcal} for i in picked]


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
            "consumed_today": consumed_today(session, crew_id, today_start),
            "suggestion": _suggest_meal(available_items(session), max(0.0, min(need / 3, need - eaten))),
            "available": [
                {
                    "food_item_id": item.food_item_id,
                    "name": item.name,
                    "kcal": item.kcal,
                    "protein_g": item.protein_g,
                    "carbs_g": item.carbs_g,
                    "fat_g": item.fat_g,
                    "available_count": item.available_count,
                    "available_portions": item.available_portions,
                }
                for item in available_items(session)
            ],
        }


class MealBody(BaseModel):
    food_item_id: int
    qty: StrictInt = Field(default=1, ge=1, le=10)


@router.post("/{crew_id}/meal")
def eat_meal(crew_id: int, body: MealBody) -> ConsumptionEvent:
    with Session(engine) as session:
        # Availability and deduction share the SQLite write lock: two crew
        # members cannot both consume the last remaining package.
        session.connection().exec_driver_sql("BEGIN IMMEDIATE")
        crew = session.get(CrewMember, crew_id)
        if crew is None:
            raise HTTPException(404, f"no crew member {crew_id}")
        available = {item.food_item_id: item for item in available_items(session)}
        item = available.get(body.food_item_id)
        if item is None or item.available_portions < body.qty:
            raise HTTPException(400, "that item isn't available in the current stock")
        event = ConsumptionEvent(
            ts=datetime.now(timezone.utc),
            food_item_id=body.food_item_id,
            qty=-body.qty,
            crew_member_id=crew_id,
        )
        session.add(event)
        register_meal(session, crew_id)
        session.commit()
        session.refresh(event)
        publish_event({"type": "meal_logged", "crew_member_id": crew_id, "food_item_id": body.food_item_id})
        return event


@router.post("/{crew_id}/meal/{event_id}/cancel")
def cancel_consumption(crew_id: int, event_id: int) -> dict:
    with Session(engine) as session:
        try:
            result = cancel_meal(session, crew_id, event_id)
        except LookupError as exc:
            raise HTTPException(404, str(exc)) from exc
    publish_event({"type": "meal_logged", "crew_member_id": crew_id})
    return result
