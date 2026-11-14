from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import CrewMember, Measurement

from .forecast import reference
from .thresholds import (
    exercise_streak_days,
    exercise_streak_level,
    level_for,
    load_demo_rules,
    load_thresholds,
    worst_level,
)

ZONE_INDICATORS: dict[str, list[str]] = {
    "brain_morale": ["mood", "sleep_h", "symptom"],
    "eyes_sans": ["symptom"],
    "heart": ["systolic_bp", "diastolic_bp", "heart_rate"],
    "bones": ["exercise_streak"],
    "muscles": ["exercise_streak", "weight_change_pct"],
    "immunity": ["temperature", "sleep_h", "symptom"],
    "skin": ["radiation_pct_of_career_limit"],
    "digestive_nutrition": ["weight_change_pct", "glucose", "symptom"],
}

# Which body zones a reported symptom speaks about. Unknown labels go to the
# brain/morale zone (general wellbeing) so nothing reported is ever dropped.
SYMPTOM_ZONES: dict[str, set[str]] = {
    "headache": {"brain_morale"},
    "fatigue": {"brain_morale", "immunity"},
    "dizziness": {"brain_morale"},
    "vision blur": {"eyes_sans"},
    "nausea": {"digestive_nutrition"},
    "congestion": {"immunity"},
}
SYMPTOM_WINDOW = timedelta(hours=24)

# Measurement type that carries each derived indicator.
RAW_TYPE: dict[str, str] = {
    "weight_change_pct": "weight",
    "exercise_streak": "exercise_min",
    "radiation_pct_of_career_limit": "radiation_dose_msv",
}
# A running total, not a reading taken at check-in: it never goes stale.
FRESHNESS_EXEMPT = {"radiation_pct_of_career_limit"}
EXERCISE_DAYS = 14


def raw_type(indicator: str) -> str:
    return RAW_TYPE.get(indicator, indicator)


def _age(ts: datetime) -> timedelta:
    """Timestamps are stored in UTC; SQLite hands them back without a zone."""
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - ts


def career_limit_msv() -> float:
    return reference()["reference_values"]["radiation_career_limit_msv"]


def recent_symptoms(session: Session, crew_member_id: int, zone: str | None = None) -> list[str]:
    rows = session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew_member_id, Measurement.type == "symptom")
        .order_by(Measurement.ts.desc())
        .limit(12)
    ).all()
    out: list[str] = []
    for row in rows:
        if _age(row.ts) >= SYMPTOM_WINDOW or not row.note:
            continue
        zones = SYMPTOM_ZONES.get(row.note.lower(), {"brain_morale"})
        if (zone is None or zone in zones) and row.note not in out:
            out.append(row.note)
    return out


# The five hazards named by NASA's Human Research Program, in the wording of
# the challenge page: space radiation, isolation and confinement, distance
# from Earth, gravity fields, hostile closed environments.
HRP_HAZARD: dict[str, str] = {
    "brain_morale": "isolation and confinement",
    "eyes_sans": "gravity fields",
    "heart": "gravity fields",
    "bones": "gravity fields",
    "muscles": "gravity fields",
    "immunity": "hostile closed environment",
    "skin": "space radiation",
    "digestive_nutrition": "hostile closed environment, distance from Earth",
}


def _latest_row(session: Session, crew_member_id: int, measurement_type: str) -> Measurement | None:
    return session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew_member_id, Measurement.type == measurement_type)
        .order_by(Measurement.ts.desc())
    ).first()


def _latest(session: Session, crew_member_id: int, measurement_type: str) -> float | None:
    row = _latest_row(session, crew_member_id, measurement_type)
    return row.value if row else None


def _recent_values(
    session: Session, crew_member_id: int, measurement_type: str, limit: int
) -> list[float]:
    rows = session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew_member_id, Measurement.type == measurement_type)
        .order_by(Measurement.ts.desc())
        .limit(limit)
    ).all()
    return [row.value for row in rows]


def daily_exercise_minutes(session: Session, crew_member_id: int, days: int = EXERCISE_DAYS) -> list[float]:
    """One value per calendar day (UTC), most recent day first. Several
    check-ins on the same day are one day: the latest one is the day's total
    (demo_rules.json, "exercise"). Days without a check-in are skipped."""
    rows = session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew_member_id, Measurement.type == "exercise_min")
        .order_by(Measurement.ts.desc(), Measurement.id.desc())
        .limit(days * 12)
    ).all()
    by_day: dict = {}
    for row in rows:
        by_day.setdefault(row.ts.date(), row.value)  # first seen = latest of that day
        if len(by_day) == days:
            break
    return list(by_day.values())


def last_checkin_ts(session: Session, crew_member_id: int) -> datetime | None:
    row = session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew_member_id, Measurement.type != "radiation_dose_msv")
        .order_by(Measurement.ts.desc())
    ).first()
    return row.ts if row else None


def indicator_value(session: Session, crew_member_id: int, indicator: str) -> float | None:
    """The number the thresholds judge: a percentage for weight change and
    radiation, a number of days for the exercise streak, the latest reading
    otherwise. None when there is no data (never a default)."""
    if indicator == "symptom":
        return None
    if indicator == "exercise_streak":
        minutes = daily_exercise_minutes(session, crew_member_id)
        return float(exercise_streak_days(minutes)) if minutes else None
    if indicator == "weight_change_pct":
        crew = session.get(CrewMember, crew_member_id)
        latest_weight = _latest(session, crew_member_id, "weight")
        if crew is None or latest_weight is None or crew.weight_kg == 0:
            return None
        return (latest_weight - crew.weight_kg) / crew.weight_kg * 100
    if indicator == "radiation_pct_of_career_limit":
        dose = _latest(session, crew_member_id, "radiation_dose_msv")
        return None if dose is None else dose / career_limit_msv() * 100
    return _latest(session, crew_member_id, indicator)


def indicator_ts(session: Session, crew_member_id: int, indicator: str) -> datetime | None:
    """When the data behind an indicator was last recorded."""
    if indicator == "symptom":
        return last_checkin_ts(session, crew_member_id)
    row = _latest_row(session, crew_member_id, raw_type(indicator))
    return row.ts if row else None


def indicator_level(
    session: Session, crew_member_id: int, indicator: str, zone: str | None = None
) -> str | None:
    """green / orange / red, or None when nothing was ever recorded."""
    if indicator == "symptom":
        # "no symptom" only means something if the astronaut has checked in
        if last_checkin_ts(session, crew_member_id) is None:
            return None
        return "orange" if recent_symptoms(session, crew_member_id, zone) else "green"
    if indicator == "exercise_streak":
        minutes = daily_exercise_minutes(session, crew_member_id)
        return exercise_streak_level(minutes) if minutes else None
    value = indicator_value(session, crew_member_id, indicator)
    return None if value is None else level_for(indicator, value)


def indicator_display(
    session: Session, crew_member_id: int, indicator: str, zone: str | None = None
) -> str:
    """Human-readable current value of an indicator, for the zone panel."""
    if indicator == "symptom":
        if last_checkin_ts(session, crew_member_id) is None:
            return "no data"
        recent = recent_symptoms(session, crew_member_id, zone)
        return ", ".join(recent) if recent else "none in the last 24 h"
    if indicator == "exercise_streak":
        minutes = daily_exercise_minutes(session, crew_member_id)
        if not minutes:
            return "no data"
        minimum = load_thresholds()["exercise_streak"]["daily_minimum_min"]
        streak = exercise_streak_days(minutes)
        if streak == 0:
            return f"{minutes[0]:g} min on the last logged day"
        return f"{streak} day{'s' if streak > 1 else ''} in a row under {minimum} min"
    if indicator == "weight_change_pct":
        pct = indicator_value(session, crew_member_id, indicator)
        weight = _latest(session, crew_member_id, "weight")
        if pct is None or weight is None:
            return "no data"
        return f"{pct:+.1f} % vs baseline ({weight:g} kg)"
    if indicator == "radiation_pct_of_career_limit":
        dose = _latest(session, crew_member_id, "radiation_dose_msv")
        if dose is None:
            return "no data"
        limit = career_limit_msv()
        return f"{dose:.0f} mSv ({dose / limit * 100:.0f} % of {limit:g} mSv)"
    row = _latest_row(session, crew_member_id, indicator)
    if row is None:
        return "no data"
    unit = "" if row.unit == "1-5" else f" {row.unit}"
    return f"{row.value:g}{' / 5' if row.unit == '1-5' else unit}"


def crew_status(session: Session, crew_member_id: int) -> dict:
    """Per-zone status. A zone is "unknown" when nothing was ever recorded
    for it (reason "no_data") or when its newest reading is too old to stand
    for today (reason "stale"); in the second case the last known level is
    returned separately so the UI can say what it was."""
    stale_after = timedelta(hours=load_demo_rules()["freshness"]["stale_after_hours"])
    zones = {}
    for zone, indicators in ZONE_INDICATORS.items():
        levels = []
        timestamps = []
        indicator_detail = {}
        for indicator in indicators:
            level = indicator_level(session, crew_member_id, indicator, zone)
            indicator_detail[indicator] = level
            if level is None:
                continue
            levels.append(level)
            if indicator not in FRESHNESS_EXEMPT:
                ts = indicator_ts(session, crew_member_id, indicator)
                if ts is not None:
                    timestamps.append(ts)

        computed = worst_level(levels)
        newest = max(timestamps) if timestamps else None
        reason = None
        if not levels:
            reason = "no_data"
        elif newest is not None and _age(newest) > stale_after:
            reason = "stale"
        zones[zone] = {
            "level": "unknown" if reason else computed,
            "reason": reason,
            "last_level": computed if reason == "stale" else None,
            "last_ts": newest.isoformat() if newest else None,
            "indicators": indicator_detail,
            "display": {i: indicator_display(session, crew_member_id, i, zone) for i in indicators},
            "hazard": HRP_HAZARD[zone],
        }
    return zones
