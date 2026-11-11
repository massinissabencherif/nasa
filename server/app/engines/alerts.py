import json
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import Alert, CrewMember, EarthMessage, MissionContext

from .advice import PROCEDURES, generate_advice
from .status import _latest, _recent_values, indicator_level

ALERT_INDICATORS: list[str] = list(PROCEDURES.keys())

_RAW_TYPE: dict[str, str] = {"weight_change_pct": "weight", "exercise_streak": "exercise_min"}


def _raw_type(indicator: str) -> str:
    return _RAW_TYPE.get(indicator, indicator)


def _trend_7d(session: Session, crew_member_id: int, indicator: str) -> str:
    if indicator in ("symptom", "radiation_pct_of_career_limit"):
        return "new onset"
    values = _recent_values(session, crew_member_id, _raw_type(indicator), limit=8)
    if len(values) < 2:
        return "new onset"
    newest, oldest = values[0], values[-1]
    diff = newest - oldest
    if abs(diff) < 0.05 * max(abs(oldest), 1):
        return "stable"
    return "rising" if diff > 0 else "falling"


def _active_context(session: Session) -> MissionContext | None:
    return session.exec(select(MissionContext).where(MissionContext.active == True)).first()  # noqa: E712


INDICATOR_TEXT: dict[str, tuple[str, str]] = {
    "systolic_bp": ("systolic BP", "mmHg"),
    "diastolic_bp": ("diastolic BP", "mmHg"),
    "heart_rate": ("resting heart rate", "bpm"),
    "temperature": ("temperature", "°C"),
    "glucose": ("glucose", "mg/dL"),
    "weight_change_pct": ("weight", "kg"),
    "sleep_h": ("sleep", "h"),
    "mood": ("mood", "/5"),
    "symptom": ("reported symptom", ""),
    "exercise_streak": ("exercise", "min/day"),
    "radiation_pct_of_career_limit": ("cumulative dose", "mSv"),
}

EARTH_SUMMARY_MAX_CHARS = 600


def _earth_payload(crew: CrewMember, findings: list[dict]) -> str:
    """Compact report for the ground: one message per check-in, however many
    indicators went red. A human-readable summary (<= 600 chars) plus the same
    facts as structured fields."""
    parts = []
    procedures: list[str] = []
    for f in findings:
        label, unit = INDICATOR_TEXT.get(f["indicator"], (f["indicator"], ""))
        f["unit"] = unit
        value_text = f"{f['value']} {unit}".strip() if f["value"] is not None else "n/a"
        parts.append(f"{label} {value_text} ({f['trend_7d']} over 7 d)")
        procedure = PROCEDURES.get(f["indicator"], "Crew wellness check-in procedure")
        if procedure not in procedures:
            procedures.append(procedure)
    summary = (
        f"RED - {crew.name} ({crew.sex}, {crew.age}y): {'; '.join(parts)}. "
        f"Crew applying: {', '.join(procedures)}. Monitoring, will report changes. "
        f"Indicative self-assessment, not a diagnosis. SIMULATED DATA."
    )[:EARTH_SUMMARY_MAX_CHARS]
    payload = {
        "summary": summary,
        "who": crew.name,
        "level": "red",
        "findings": findings,
        # first finding repeated at top level for simple consumers
        "indicator": findings[0]["indicator"],
        "value": findings[0]["value"],
        "unit": findings[0]["unit"],
        "trend_7d": findings[0]["trend_7d"],
        "actions_taken": [f"Procedure: {p}" for p in procedures] + ["crew notified on station and mobile"],
    }
    return json.dumps(payload)


def _scripted_reply(level: str) -> str:
    if level == "red":
        return (
            "Mission Control: acknowledged. Follow the onboard procedure, reassess in 6h, "
            "escalate only if it worsens. No evacuation indicated. "
            "— Flight Surgeon (SIMULATED REPLY)"
        )
    return "Mission Control: noted, keep monitoring. — Flight Surgeon (SIMULATED REPLY)"


def evaluate_and_alert(session: Session, crew_member_id: int, use_llm: bool = False) -> list[Alert]:
    """Check every alertable indicator for one crew member; create an Alert (and,
    for red, a queued EarthMessage) for each that just changed level. Does not
    commit — the caller owns the transaction. Only level *changes* create a new
    alert, so repeated check-ins at the same level don't spam the crew or Earth
    (PROMPT_FABLE.md §7: "only significant changes are sent")."""
    crew = session.get(CrewMember, crew_member_id)
    if crew is None:
        return []

    now = datetime.now(timezone.utc)
    created: list[Alert] = []
    red_findings: list[dict] = []
    red_alert_ids: list[int] = []

    for indicator in ALERT_INDICATORS:
        level = indicator_level(session, crew_member_id, indicator)
        last_alert = session.exec(
            select(Alert)
            .where(Alert.crew_member_id == crew_member_id, Alert.indicator == indicator)
            .order_by(Alert.ts.desc(), Alert.id.desc())
        ).first()
        active = last_alert if last_alert is not None and not last_alert.resolved else None

        if level not in ("orange", "red"):
            if active is not None:
                active.resolved = True  # back to nominal: a relapse must alert again
                session.add(active)
            continue
        if active is not None and active.level == level:
            continue
        if active is not None:
            active.resolved = True  # superseded by the new level
            session.add(active)

        message, _source = generate_advice(indicator, use_llm=use_llm)
        alert = Alert(
            ts=now,
            crew_member_id=crew_member_id,
            level=level,
            indicator=indicator,
            message=message,
            sent_to_earth=(level == "red"),
        )
        session.add(alert)
        session.flush()
        created.append(alert)

        if level == "red":
            value = _latest(session, crew_member_id, _raw_type(indicator))
            red_findings.append({
                "indicator": indicator,
                "value": round(value, 1) if value is not None else None,
                "trend_7d": _trend_7d(session, crew_member_id, indicator),
            })
            red_alert_ids.append(alert.id)

    if red_findings:
        context = _active_context(session)
        delay_s = context.delay_s if context else 1200
        scale = context.time_scale if context else 1.0
        effective_delay = max(1, round(delay_s / scale))
        deliver_ts = now + timedelta(seconds=effective_delay)
        session.add(
            EarthMessage(
                created_ts=now,
                deliver_ts=deliver_ts,
                reply_ts=deliver_ts + timedelta(seconds=effective_delay),
                payload=_earth_payload(crew, red_findings),
                reply_payload=_scripted_reply("red"),
                status="queued",
                alert_id=red_alert_ids[0],
            )
        )
        session.flush()

    return created
