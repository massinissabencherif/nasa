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


def _earth_payload(crew: CrewMember, indicator: str, value: float | None, level: str, trend: str) -> str:
    payload = {
        "who": crew.name,
        "indicator": indicator,
        "value": round(value, 1) if value is not None else None,
        "level": level,
        "trend_7d": trend,
        "actions_taken": [],
    }
    return json.dumps(payload)[:600]


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

    for indicator in ALERT_INDICATORS:
        level = indicator_level(session, crew_member_id, indicator)
        if level not in ("orange", "red"):
            continue

        last_alert = session.exec(
            select(Alert)
            .where(Alert.crew_member_id == crew_member_id, Alert.indicator == indicator)
            .order_by(Alert.ts.desc())
        ).first()
        if last_alert is not None and last_alert.level == level:
            continue

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
            context = _active_context(session)
            delay_s = context.delay_s if context else 1200
            scale = context.time_scale if context else 1.0
            effective_delay = max(1, round(delay_s / scale))
            value = _latest(session, crew_member_id, _raw_type(indicator))
            trend = _trend_7d(session, crew_member_id, indicator)
            deliver_ts = now + timedelta(seconds=effective_delay)
            session.add(
                EarthMessage(
                    created_ts=now,
                    deliver_ts=deliver_ts,
                    reply_ts=deliver_ts + timedelta(seconds=effective_delay),
                    payload=_earth_payload(crew, indicator, value, level, trend),
                    reply_payload=_scripted_reply(level),
                    status="queued",
                    alert_id=alert.id,
                )
            )
            session.flush()

    return created
