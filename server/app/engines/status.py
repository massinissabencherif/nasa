from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.models import CrewMember, Measurement

from .thresholds import exercise_streak_level, level_for, worst_level

ZONE_INDICATORS: dict[str, list[str]] = {
    "brain_morale": ["mood", "sleep_h", "symptom"],
    "eyes_sans": ["symptom"],
    "heart": ["systolic_bp", "diastolic_bp", "heart_rate"],
    "bones": ["exercise_streak"],
    "muscles": ["exercise_streak", "weight_change_pct"],
    "immunity": ["temperature", "sleep_h", "symptom"],
    "skin": ["radiation_pct_of_career_limit"],
    "digestive_nutrition": ["weight_change_pct", "glucose"],
}

HRP_HAZARD: dict[str, str] = {
    "brain_morale": "isolation & confinement",
    "eyes_sans": "altered gravity",
    "heart": "altered gravity / cardiovascular",
    "bones": "altered gravity",
    "muscles": "altered gravity",
    "immunity": "closed environment / stress",
    "skin": "radiation",
    "digestive_nutrition": "closed environment / insufficient nutrition",
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


def indicator_level(session: Session, crew_member_id: int, indicator: str) -> str | None:
    if indicator == "symptom":
        row = _latest_row(session, crew_member_id, "symptom")
        if row is None:
            return "green"
        recent = datetime.now(row.ts.tzinfo) - row.ts < timedelta(hours=24)
        return "orange" if recent else "green"
    if indicator == "exercise_streak":
        minutes = _recent_values(session, crew_member_id, "exercise_min", limit=14)
        if not minutes:
            return None
        return exercise_streak_level(minutes)
    if indicator == "weight_change_pct":
        crew = session.get(CrewMember, crew_member_id)
        latest_weight = _latest(session, crew_member_id, "weight")
        if crew is None or latest_weight is None or crew.weight_kg == 0:
            return None
        pct = (latest_weight - crew.weight_kg) / crew.weight_kg * 100
        return level_for("weight_change_pct", pct)
    if indicator == "radiation_pct_of_career_limit":
        dose = _latest(session, crew_member_id, "radiation_dose_msv")
        if dose is None:
            return None
        pct = dose / 600 * 100
        return level_for("radiation_pct_of_career_limit", pct)
    value = _latest(session, crew_member_id, indicator)
    if value is None:
        return None
    return level_for(indicator, value)


def crew_status(session: Session, crew_member_id: int) -> dict:
    zones = {}
    for zone, indicators in ZONE_INDICATORS.items():
        levels = []
        indicator_detail = {}
        for indicator in indicators:
            level = indicator_level(session, crew_member_id, indicator)
            indicator_detail[indicator] = level
            if level is not None:
                levels.append(level)
        zones[zone] = {
            "level": worst_level(levels) if levels else "green",
            "indicators": indicator_detail,
            "hazard": HRP_HAZARD[zone],
        }
    return zones
