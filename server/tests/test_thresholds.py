from app.engines.thresholds import exercise_streak_level, level_for, worst_level


def test_systolic_bp_bands():
    assert level_for("systolic_bp", 110) == "green"
    assert level_for("systolic_bp", 130) == "orange"
    assert level_for("systolic_bp", 85) == "orange"
    assert level_for("systolic_bp", 145) == "red"
    assert level_for("systolic_bp", 70) == "red"


def test_temperature_bands():
    assert level_for("temperature", 36.8) == "green"
    assert level_for("temperature", 37.5) == "orange"
    assert level_for("temperature", 38.5) == "red"
    assert level_for("temperature", 35.0) == "red"


def test_mood_bands():
    assert level_for("mood", 5) == "green"
    assert level_for("mood", 3) == "orange"
    assert level_for("mood", 1) == "red"


def test_radiation_pct():
    assert level_for("radiation_pct_of_career_limit", 50) == "green"
    assert level_for("radiation_pct_of_career_limit", 85) == "orange"
    assert level_for("radiation_pct_of_career_limit", 110) == "red"


def test_exercise_streak_level():
    assert exercise_streak_level([45, 40, 50]) == "green"
    assert exercise_streak_level([10, 15, 5, 50]) == "orange"
    assert exercise_streak_level([10] * 7 + [50]) == "red"


def test_worst_level():
    assert worst_level(["green", "orange", "green"]) == "orange"
    assert worst_level(["green", "red", "orange"]) == "red"
    assert worst_level([]) == "green"


def test_symptoms_only_colour_the_zones_they_concern():
    from sqlmodel import Session, select

    from app.db import engine
    from app.engines.checkin import record_checkin
    from app.engines.status import crew_status
    from app.models import CrewMember
    from app.seed import reset_and_seed

    reset_and_seed()
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).first()
        record_checkin(session, crew, {}, ["Vision blur"])
        zones = crew_status(session, crew.id)
        assert zones["eyes_sans"]["level"] == "orange"
        assert zones["eyes_sans"]["display"]["symptom"] == "Vision blur"
        assert zones["brain_morale"]["level"] == "green"
        assert zones["immunity"]["level"] == "green"
