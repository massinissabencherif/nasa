import json
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import Alert, CrewMember, EarthMessage, MissionContext

from .advice import PROCEDURES, AdviceContext, generate_advice
from .status import _latest, _recent_values, indicator_level, indicator_value, raw_type
from .thresholds import direction_of, is_critical, load_demo_rules

ALERT_INDICATORS: list[str] = list(PROCEDURES.keys())


def _raw_type(indicator: str) -> str:
    return raw_type(indicator)


def should_report_to_earth(levels: dict[str, str | None], values: dict[str, float | None]) -> bool:
    """Demo rule (demo_rules.json): a report goes to Earth when one red
    indicator is in its critical band, or when several indicators are red at
    once. A colour alone never escalates."""
    reds = [indicator for indicator, level in levels.items() if level == "red"]
    if not reds:
        return False
    if any(is_critical(indicator, values.get(indicator)) for indicator in reds):
        return True
    return len(reds) >= load_demo_rules()["earth_report"]["min_red_indicators"]


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
    "reaction_change_pct": ("reaction time", "ms"),
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
        "kind": "report",
        "crew_member_id": crew.id,
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


def evaluate_and_alert(session: Session, crew_member_id: int, use_llm: bool = False) -> list[Alert]:
    """Check every alertable indicator for one crew member; create an Alert
    for each that just changed level and, when the escalation rule is met, one
    queued EarthMessage listing every red finding. Does not commit — the
    caller owns the transaction. Only level *changes* create a new alert, so
    repeated check-ins at the same level don't spam the crew or Earth."""
    crew = session.get(CrewMember, crew_member_id)
    if crew is None:
        return []

    now = datetime.now(timezone.utc)
    context = _active_context(session)
    delay_s = context.delay_s if context else 1200

    levels = {i: indicator_level(session, crew_member_id, i) for i in ALERT_INDICATORS}
    values = {i: indicator_value(session, crew_member_id, i) for i in ALERT_INDICATORS}
    escalate = should_report_to_earth(levels, values)

    created: list[Alert] = []
    active_reds: list[Alert] = []  # red alerts standing after this evaluation

    for indicator in ALERT_INDICATORS:
        level = levels[indicator]
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
            if level == "red":
                active_reds.append(active)
            continue
        if active is not None:
            active.resolved = True  # superseded by the new level
            session.add(active)

        advice_context = AdviceContext(
            level=level,
            value=values[indicator],
            direction=direction_of(indicator, values[indicator]),
            sent_to_earth=level == "red" and escalate,
            round_trip_s=2 * delay_s,
        )
        message, _source = generate_advice(indicator, advice_context, use_llm=use_llm)
        alert = Alert(
            ts=now,
            crew_member_id=crew_member_id,
            level=level,
            indicator=indicator,
            message=message,
            sent_to_earth=advice_context.sent_to_earth,
        )
        session.add(alert)
        session.flush()
        created.append(alert)
        if level == "red":
            active_reds.append(alert)

    new_red = any(alert.level == "red" for alert in created)
    already_reported = any(alert.sent_to_earth for alert in active_reds if alert not in created)
    if escalate and active_reds and (new_red or not already_reported):
        findings = []
        for alert in active_reds:
            value = _latest(session, crew_member_id, _raw_type(alert.indicator))
            findings.append({
                "indicator": alert.indicator,
                "value": round(value, 1) if value is not None else None,
                "trend_7d": _trend_7d(session, crew_member_id, alert.indicator),
            })
            alert.sent_to_earth = True
            session.add(alert)

        scale = context.time_scale if context else 1.0
        effective_delay = max(1, round(delay_s / scale))
        deliver_ts = now + timedelta(seconds=effective_delay)
        from .earth_link import ensure_plan, reply_to_report  # local: earth_link reads alerts' models

        payload = json.loads(_earth_payload(crew, findings))
        payload["mission_context"] = {"type": context.type, "label": context.label} if context else None
        message = EarthMessage(
            created_ts=now,
            deliver_ts=deliver_ts,
            reply_ts=deliver_ts + timedelta(seconds=effective_delay),
            payload=json.dumps(payload),
            # Earth answers what it received, nothing more (simulated)
            reply_payload=reply_to_report(payload),
            status="queued",
            alert_id=active_reds[0].id,
        )
        session.add(message)
        session.flush()
        ensure_plan(session, message)

    return created
