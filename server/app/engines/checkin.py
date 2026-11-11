"""One code path for every check-in: the mobile form, the demo scenarios and
the tests all go through record_checkin(), so alerts, Earth messages and
gamification behave identically however the data arrived."""

from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models import Alert, CrewMember, Measurement, MissionContext

from .alerts import evaluate_and_alert
from .gamification import register_checkin

CHECKIN_FIELDS: dict[str, str] = {
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


def record_checkin(
    session: Session,
    crew: CrewMember,
    values: dict[str, float | None],
    symptoms: list[str] | None = None,
    source: str = "manual",
) -> tuple[list[Measurement], list[Alert]]:
    """Stores the measurements, runs the alert engine, updates gamification.
    Commits. Returns (measurements, newly created alerts)."""
    ts = datetime.now(timezone.utc)
    created: list[Measurement] = []
    for field, unit in CHECKIN_FIELDS.items():
        value = values.get(field)
        if value is None:
            continue
        created.append(
            Measurement(ts=ts, crew_member_id=crew.id, type=field, value=value, unit=unit, source=source)
        )
    for symptom in symptoms or []:
        created.append(
            Measurement(
                ts=ts, crew_member_id=crew.id, type="symptom", value=1, unit="count",
                source=source, note=symptom,
            )
        )
    session.add_all(created)
    session.flush()

    context = session.exec(
        select(MissionContext).where(MissionContext.active == True)  # noqa: E712
    ).first()
    use_llm = bool(context and context.use_llm_advice)
    alerts = evaluate_and_alert(session, crew.id, use_llm=use_llm)
    register_checkin(session, crew.id, ts, exercise_min=values.get("exercise_min"))
    session.commit()
    for row in [*created, *alerts]:
        session.refresh(row)
    return created, alerts
