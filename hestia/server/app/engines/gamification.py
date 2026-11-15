"""Streak, score and badges. Deliberately simple and transparent: the rules
are listed in BADGES and returned to the UI with each badge."""

import json
from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import ConsumptionEvent, CrewMember, Gamification, Measurement

from .nutrition import daily_need, kcal_eaten_today, consumed_today

POINTS_CHECKIN = 10
POINTS_EXERCISE = 5
POINTS_MEAL = 3
EXERCISE_TARGET_MIN = 30

BADGES: list[dict[str, str]] = [
    {"key": "streak_7", "label": "7-day streak", "rule": "Check in 7 days in a row."},
    {"key": "exercise_hero", "label": "Exercise hero",
     "rule": "30+ minutes of exercise on each of your last 7 logged days."},
    {"key": "balanced_meals", "label": "Balanced meals",
     "rule": "Log meals covering 80-110% of today's energy need."},
]


def _row(session: Session, crew_member_id: int) -> Gamification:
    row = session.get(Gamification, crew_member_id)
    if row is None:
        row = Gamification(crew_member_id=crew_member_id)
        session.add(row)
    return row


def register_checkin(session: Session, crew_member_id: int, ts: datetime, exercise_min: float | None) -> None:
    """First check-in of a (UTC) day extends or restarts the streak. Does not commit."""
    row = _row(session, crew_member_id)
    today = ts.date()
    if row.last_checkin_date != today.isoformat():
        yesterday = (today - timedelta(days=1)).isoformat()
        row.streak = row.streak + 1 if row.last_checkin_date == yesterday else 1
        row.last_checkin_date = today.isoformat()
        row.score += POINTS_CHECKIN
    if exercise_min is not None and exercise_min >= EXERCISE_TARGET_MIN:
        row.score += POINTS_EXERCISE
    session.add(row)


def register_meal(session: Session, crew_member_id: int) -> None:
    row = _row(session, crew_member_id)
    row.score += POINTS_MEAL
    session.add(row)


def unregister_meal(session: Session, crew_member_id: int) -> None:
    row = _row(session, crew_member_id)
    row.score = max(0, row.score - POINTS_MEAL)
    session.add(row)


def _earned(session: Session, crew: CrewMember, row: Gamification) -> set[str]:
    earned: set[str] = set()
    if row.streak >= 7:
        earned.add("streak_7")
    exercise = session.exec(
        select(Measurement)
        .where(Measurement.crew_member_id == crew.id, Measurement.type == "exercise_min")
        .order_by(Measurement.ts.desc())
        .limit(7)
    ).all()
    if len(exercise) == 7 and all(m.value >= EXERCISE_TARGET_MIN for m in exercise):
        earned.add("exercise_hero")
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    need = daily_need(crew)
    eaten = kcal_eaten_today(session, crew.id, day_start)
    if need > 0 and 0.8 <= eaten / need <= 1.1:
        earned.add("balanced_meals")
    return earned


def gamification_report(session: Session, crew: CrewMember) -> dict:
    row = _row(session, crew.id)
    earned = _earned(session, crew, row)
    row.badges_json = json.dumps(sorted(earned))
    session.add(row)
    session.commit()

    all_rows = session.exec(select(Gamification)).all()
    ranking = sorted(all_rows, key=lambda r: r.score, reverse=True)
    rank = next((i + 1 for i, r in enumerate(ranking) if r.crew_member_id == crew.id), None)
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    meals_today = sum(not item["cancelled"] for item in consumed_today(session, crew.id, start))
    return {
        "streak": row.streak,
        "score": row.score,
        "rank": rank,
        "crew_size": len(all_rows),
        "crew_score": sum(r.score for r in all_rows),
        "meals_logged_today": meals_today,
        "badges": [{**b, "earned": b["key"] in earned} for b in BADGES],
    }
