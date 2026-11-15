"""What the crew does while a report travels to Earth and back.

A report to Earth takes the one-way delay to arrive and as long again for a
reply. This module gives that wait a content: the onboard plan (steps ticked
by a person), the comparison between what Earth will read and what is true on
board now, the demo rules that say when not to wait for Earth, an update the
crew can send, and a simulated reply built from what Earth actually received.

All rules here are team demo rules (demo_rules.json), not medical protocols.
"""

import json
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import Alert, CrewMember, EarthMessage, MissionContext, OnboardStep

from .advice import PROCEDURES
from .status import _latest_row, indicator_level, indicator_value, raw_type
from .thresholds import green_range, is_critical, load_demo_rules

REMEASURE_AFTER_S = 3600  # the advice says "measure again in 1 hour"
SUMMARY_MAX_CHARS = 600
DISCLAIMER = "Indicative self-assessment, not a diagnosis. SIMULATED DATA."

INDICATOR_TEXT: dict[str, tuple[str, str]] = {
    "systolic_bp": ("systolic BP", "mmHg"),
    "diastolic_bp": ("diastolic BP", "mmHg"),
    "heart_rate": ("resting heart rate", "bpm"),
    "temperature": ("temperature", "°C"),
    "glucose": ("glucose", "mg/dL"),
    "weight_change_pct": ("weight change", "%"),
    "sleep_h": ("sleep", "h"),
    "mood": ("mood", "/5"),
    "symptom": ("reported symptom", ""),
    "exercise_streak": ("days under the exercise minimum", "d"),
    "radiation_pct_of_career_limit": ("cumulative dose", "% of limit"),
    "reaction_change_pct": ("reaction time change", "%"),
}


def _utc(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)


def _context(session: Session) -> MissionContext | None:
    return session.exec(select(MissionContext).where(MissionContext.active == True)).first()  # noqa: E712


def effective_delay_s(session: Session) -> int:
    """One-way delay in demo seconds (the demo clock may run faster)."""
    context = _context(session)
    delay = context.delay_s if context else 1200
    scale = context.time_scale if context else 1.0
    return max(1, round(delay / scale))


def payload_of(message: EarthMessage) -> dict:
    try:
        return json.loads(message.payload)
    except (TypeError, ValueError):
        return {"summary": message.payload}


def crew_member_of(session: Session, message: EarthMessage) -> int | None:
    payload = payload_of(message)
    if payload.get("crew_member_id") is not None:
        return int(payload["crew_member_id"])
    alert = session.get(Alert, message.alert_id) if message.alert_id else None
    return alert.crew_member_id if alert else None


def _fmt(indicator: str, value: float | None) -> str:
    label, unit = INDICATOR_TEXT.get(indicator, (indicator, ""))
    return f"{label} {value} {unit}".strip() if value is not None else f"{label} n/a"


# ------------------------------------------------------------------ plan


def ensure_plan(session: Session, message: EarthMessage) -> list[OnboardStep]:
    """The steps for this report; created once, from its findings."""
    steps = session.exec(
        select(OnboardStep).where(OnboardStep.message_id == message.id).order_by(OnboardStep.position)
    ).all()
    if steps or payload_of(message).get("kind") == "update":
        return list(steps)
    findings = payload_of(message).get("findings", [])
    procedures: list[str] = []
    for f in findings:
        procedure = PROCEDURES.get(f.get("indicator", ""), "Crew wellness check-in procedure")
        if procedure not in procedures:
            procedures.append(procedure)
    created = _utc(message.created_ts)
    context = _context(session)
    scale = context.time_scale if context else 1.0
    labels: list[tuple[str, datetime | None]] = [("Tell the crew medical officer", created)]
    labels += [(f"Apply the {p.lower()}", created) for p in procedures]
    labels.append(("Measure again and log it", created + timedelta(seconds=REMEASURE_AFTER_S / scale)))
    steps = [
        OnboardStep(message_id=message.id, position=i, label=label, due_ts=due)
        for i, (label, due) in enumerate(labels)
    ]
    for step in steps:
        session.add(step)
    session.flush()
    return steps


# ------------------------------------------------------- earth vs on board


def _distance_to_range(indicator: str, value: float) -> float:
    low, high = green_range(indicator)
    if low is not None and value < low:
        return low - value
    if high is not None and value > high:
        return value - high
    return 0.0


def change_of(indicator: str, before: float | None, now: float | None) -> str:
    """Plain direction relative to the indicative range: better, worse, same."""
    if before is None or now is None:
        return "unknown"
    d_before, d_now = _distance_to_range(indicator, before), _distance_to_range(indicator, now)
    if abs(d_now - d_before) < 1e-9:
        return "same"
    return "better" if d_now < d_before else "worse"


def onboard_now(session: Session, crew_member_id: int, findings: list[dict]) -> list[dict]:
    out = []
    for f in findings:
        indicator = f.get("indicator", "")
        value = indicator_value(session, crew_member_id, indicator)
        row = _latest_row(session, crew_member_id, raw_type(indicator))
        out.append({
            "indicator": indicator,
            "sent_value": f.get("value"),
            "value": round(value, 1) if value is not None else None,
            "unit": f.get("unit") or INDICATOR_TEXT.get(indicator, ("", ""))[1],
            "level": indicator_level(session, crew_member_id, indicator),
            "measured_ts": row.ts if row else None,
            "change": change_of(indicator, f.get("value"), value),
        })
    return out


# ------------------------------------------------------ do not wait rules


def _band_text(indicator: str) -> str | None:
    bands = load_demo_rules()["earth_report"]["critical"].get(indicator, [])
    if not bands:
        return None
    signs = {"gte": "≥", "gt": ">", "lte": "≤", "lt": "<"}
    unit = INDICATOR_TEXT.get(indicator, ("", ""))[1]
    parts = [" and ".join(f"{signs[k]} {v}" for k, v in band.items()) for band in bands]
    label = INDICATOR_TEXT.get(indicator, (indicator, ""))[0]
    return f"{label} {' or '.join(parts)} {unit}".strip()


def dont_wait_rules(session: Session, message: EarthMessage, crew_member_id: int | None) -> dict:
    """When the crew acts without waiting for Earth's reply (demo rules)."""
    findings = payload_of(message).get("findings", [])
    rules = []
    for f in findings:
        indicator = f.get("indicator", "")
        text = _band_text(indicator)
        if text is None or crew_member_id is None:
            continue
        rules.append({
            "kind": "critical",
            "indicator": indicator,
            "text": text,
            "triggered": is_critical(indicator, indicator_value(session, crew_member_id, indicator)),
        })
    others_red = session.exec(
        select(Alert).where(
            Alert.level == "red",
            Alert.resolved == False,  # noqa: E712
            Alert.crew_member_id != crew_member_id,
        )
    ).first()
    rules.append({"kind": "second_person", "indicator": None, "text": "another crew member turns red", "triggered": others_red is not None})
    return {"rules": rules, "triggered": any(r["triggered"] for r in rules)}


# ---------------------------------------------------------- simulated reply


def _watch_line(findings: list[dict]) -> str:
    bands = [b for f in findings if (b := _band_text(f.get("indicator", "")))]
    return f" Do not wait for us if {' or '.join(bands)}: act on the onboard procedure." if bands else ""


def reply_to_report(payload: dict) -> str:
    findings = payload.get("findings", [])
    read = "; ".join(f"{_fmt(f.get('indicator', ''), f.get('value'))} ({f.get('trend_7d', 'n/a')})" for f in findings)
    procedures = [a.removeprefix("Procedure: ") for a in payload.get("actions_taken", []) if a.startswith("Procedure: ")]
    keep = f" Keep applying: {', '.join(procedures)}." if procedures else ""
    return (
        f"Mission Control: report on {payload.get('who', 'the crew member')} received. We read: {read}."
        f"{keep} The crew medical officer leads on board. Measure again and send us an update."
        f"{_watch_line(findings)} — Flight Surgeon (SIMULATED REPLY)"
    )


def reply_to_update(payload: dict) -> str:
    findings = payload.get("findings", [])
    changes = [f.get("change") for f in findings]
    read = "; ".join(
        f"{_fmt(f.get('indicator', ''), f.get('value'))} (was {f.get('previous')})" for f in findings
    )
    if any(c == "worse" for c in changes):
        advice = (
            "It is getting worse: the crew medical officer applies the onboard procedure now, "
            "without waiting for our next message, and sends another update after it."
        )
    elif changes and all(c == "better" for c in changes):
        advice = "It is improving: continue the procedure and the planned measurements."
    else:
        advice = "No clear change: keep the procedure and measure again."
    return (
        f"Mission Control: update on {payload.get('who', 'the crew member')} received. We read: {read}. "
        f"{advice}{_watch_line(findings)} — Flight Surgeon (SIMULATED REPLY)"
    )


# ------------------------------------------------------------------ update


def build_update(session: Session, parent: EarthMessage) -> dict | None:
    """The update the crew could send now: latest values against what Earth
    received, and the steps already done. None without a crew member."""
    crew_id = crew_member_of(session, parent)
    crew = session.get(CrewMember, crew_id) if crew_id is not None else None
    if crew is None:
        return None
    sent = payload_of(parent).get("findings", [])
    now_rows = onboard_now(session, crew.id, sent)
    findings = [
        {
            "indicator": r["indicator"],
            "value": r["value"],
            "unit": r["unit"],
            "previous": r["sent_value"],
            "change": r["change"],
        }
        for r in now_rows
    ]
    done = [s.label for s in ensure_plan(session, parent) if s.done_ts is not None]
    parts = [f"{_fmt(f['indicator'], f['value'])} (was {f['previous']})" for f in findings]
    summary = (
        f"UPDATE to report #{parent.id} - {crew.name}: {'; '.join(parts)}. "
        + (f"Done on board: {', '.join(done)}. " if done else "")
        + DISCLAIMER
    )[:SUMMARY_MAX_CHARS]
    worst = max((r["level"] or "green" for r in now_rows), key=["green", "orange", "red"].index, default="green")
    return {
        "kind": "update",
        "parent_id": parent.id,
        "crew_member_id": crew.id,
        "who": crew.name,
        "level": worst,
        "summary": summary,
        "findings": findings,
        "actions_taken": done,
    }


def send_update(session: Session, parent: EarthMessage, now: datetime | None = None) -> EarthMessage | None:
    payload = build_update(session, parent)
    if payload is None:
        return None
    now = now or datetime.now(timezone.utc)
    delay = effective_delay_s(session)
    message = EarthMessage(
        created_ts=now,
        deliver_ts=now + timedelta(seconds=delay),
        reply_ts=now + timedelta(seconds=2 * delay),
        payload=json.dumps(payload),
        reply_payload=reply_to_update(payload),
        status="queued",
        alert_id=parent.alert_id,
    )
    session.add(message)
    session.flush()
    return message
