"""Demo controls. `demo-mars` resets to the calm seeded baseline; the other
scenarios replay one step of docs/demo-script.md through the exact same code
paths a live user action takes (check-in engine, scan route), so they are a
safety net for the stage, not a separate fake."""

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from app.db import engine
from app.engines.checkin import record_checkin
from app.models import CrewMember
from app.routes.events import publish_event
from app.routes.pantry import scan_pantry
from app.seed import PRIMED_LOW_EXERCISE, SCRIPTED_RED, reset_and_seed

router = APIRouter(prefix="/api/demo", tags=["demo"])

SCENARIOS = {
    "demo-mars": "Reset everything to the seeded Mars-base baseline (~412 days of autonomy).",
    "low-exercise": f"{PRIMED_LOW_EXERCISE} logs a third low-exercise day: bone zone turns orange.",
    "red-alert": f"{SCRIPTED_RED} logs fever + high heart rate: red alert and Earth report.",
    "shelf-removal": "Mock scan of the shelf after the 3 A1 cans were removed (no camera needed).",
}


@router.get("/scenarios")
def list_scenarios() -> dict[str, str]:
    return SCENARIOS


@router.post("/reset")
def demo_reset() -> dict:
    reset_and_seed()
    publish_event({"type": "reset"})
    return {"status": "reseeded"}


def _checkin_as(name: str, values: dict, symptoms: list[str]) -> dict:
    with Session(engine) as session:
        crew = session.exec(select(CrewMember).where(CrewMember.name == name)).first()
        if crew is None:
            raise HTTPException(409, "database is not seeded: run the demo-mars scenario first")
        _measurements, alerts = record_checkin(session, crew, values, symptoms, source="simulated")
        out = [{"indicator": a.indicator, "level": a.level} for a in alerts]
        crew_id = crew.id
    publish_event({"type": "checkin", "crew_member_id": crew_id})
    for alert in out:
        publish_event({"type": "alert_created", "crew_member_id": crew_id, **alert})
    return {"crew_member_id": crew_id, "alerts": out}


@router.post("/scenario/{name}")
def demo_scenario(name: str) -> dict:
    if name not in SCENARIOS:
        raise HTTPException(404, f"unknown scenario '{name}'")
    if name == "demo-mars":
        reset_and_seed()
        publish_event({"type": "reset"})
        return {"status": "reseeded", "scenario": name}
    if name == "low-exercise":
        result = _checkin_as(PRIMED_LOW_EXERCISE, {"exercise_min": 10, "sleep_h": 7.5, "mood": 4}, [])
    elif name == "red-alert":
        result = _checkin_as(
            SCRIPTED_RED, {"temperature": 38.6, "heart_rate": 124, "sleep_h": 7.2, "mood": 4}, ["Fatigue"]
        )
    else:
        result = scan_pantry(mode="mock", variant="after_removal")
    return {"status": "ok", "scenario": name, "result": result}
