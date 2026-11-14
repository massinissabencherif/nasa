import json
from datetime import timedelta

import pytest
from sqlmodel import Session, select

from app.db import engine
from app.engines.advice import DISCLAIMER, AdviceContext, deterministic_advice, passes_guardrails
from app.engines.checkin import record_checkin
from app.engines.status import crew_status
from app.models import Alert, CrewMember, EarthMessage, Measurement
from app.seed import reset_and_seed


@pytest.fixture(autouse=True)
def seeded_db():
    reset_and_seed()
    yield


def _crew(session, name):
    return session.exec(select(CrewMember).where(CrewMember.name == name)).first()


def test_seeded_baseline_is_calm():
    with Session(engine) as session:
        assert session.exec(select(Alert)).all() == []
        assert session.exec(select(EarthMessage)).all() == []


def test_third_low_exercise_day_turns_bones_orange_without_an_earth_message():
    with Session(engine) as session:
        chen = _crew(session, "Chen Wei")
        _m, alerts = record_checkin(session, chen, {"exercise_min": 10})
        assert [(a.indicator, a.level) for a in alerts] == [("exercise_streak", "orange")]
        assert not alerts[0].sent_to_earth
        assert crew_status(session, chen.id)["bones"]["level"] == "orange"
        assert session.exec(select(EarthMessage)).all() == []


def test_red_alert_queues_an_earth_message_with_delay_and_compact_report():
    with Session(engine) as session:
        sofia = _crew(session, "Sofia Lindqvist")
        _m, alerts = record_checkin(session, sofia, {"temperature": 38.6, "heart_rate": 124})
        reds = {a.indicator: a for a in alerts if a.level == "red"}
        assert set(reds) == {"temperature", "heart_rate"}
        messages = session.exec(select(EarthMessage)).all()
        assert len(messages) == 1  # one report per check-in, not one per indicator
        message = messages[0]

    assert (message.deliver_ts - message.created_ts).total_seconds() == pytest.approx(1200, abs=1)
    assert (message.reply_ts - message.deliver_ts).total_seconds() == pytest.approx(1200, abs=1)
    assert "SIMULATED" in message.reply_payload
    payload = json.loads(message.payload)
    assert payload["who"] == "Sofia Lindqvist" and payload["level"] == "red"
    assert len(payload["summary"]) <= 600 and payload["actions_taken"]
    assert {f["indicator"] for f in payload["findings"]} == {"temperature", "heart_rate"}


def test_unchanged_level_does_not_create_a_duplicate_alert():
    with Session(engine) as session:
        chen = _crew(session, "Chen Wei")
        record_checkin(session, chen, {"exercise_min": 10})
        _m, again = record_checkin(session, chen, {"exercise_min": 12})
        assert again == []


def test_recovery_resolves_the_alert_and_a_relapse_alerts_again():
    with Session(engine) as session:
        priya = _crew(session, "Priya Nair")
        _m, first = record_checkin(session, priya, {"heart_rate": 150})
        assert [(a.indicator, a.level) for a in first] == [("heart_rate", "red")]
        _m, recovered = record_checkin(session, priya, {"heart_rate": 70})
        assert recovered == []
        session.refresh(first[0])
        assert first[0].resolved is True
        _m, relapse = record_checkin(session, priya, {"heart_rate": 150})
        assert [(a.indicator, a.level) for a in relapse] == [("heart_rate", "red")]


def test_several_checkins_on_one_day_are_one_day_of_exercise():
    with Session(engine) as session:
        alex = _crew(session, "Alex Mercer")
        for _ in range(7):
            _m, alerts = record_checkin(session, alex, {"exercise_min": 10})
            assert alerts == []
        bones = crew_status(session, alex.id)["bones"]
        assert bones["level"] == "green"
        assert bones["display"]["exercise_streak"] == "1 day in a row under 30 min"
        assert session.exec(select(EarthMessage)).all() == []
        # the latest check-in of the day replaces the earlier ones
        record_checkin(session, alex, {"exercise_min": 45})
        assert crew_status(session, alex.id)["bones"]["display"]["exercise_streak"] == "45 min on the last logged day"


def test_a_crew_member_without_any_measurement_is_unknown_not_green():
    with Session(engine) as session:
        nobody = CrewMember(name="Nobody", sex="F", age=35, height_cm=165, weight_kg=60,
                            activity_factor=1.5, avatar="x")
        session.add(nobody)
        session.commit()
        zones = crew_status(session, nobody.id)
        assert {zone["level"] for zone in zones.values()} == {"unknown"}
        assert {zone["reason"] for zone in zones.values()} == {"no_data"}
        assert zones["heart"]["display"]["heart_rate"] == "no data"
        assert zones["brain_morale"]["display"]["symptom"] == "no data"


def test_an_old_reading_is_stale_and_keeps_its_last_level():
    with Session(engine) as session:
        alex = _crew(session, "Alex Mercer")
        assert crew_status(session, alex.id)["heart"]["level"] == "green"
        for row in session.exec(select(Measurement).where(Measurement.crew_member_id == alex.id)):
            row.ts = row.ts - timedelta(days=5)
            session.add(row)
        session.commit()
        zones = crew_status(session, alex.id)
        assert (zones["heart"]["level"], zones["heart"]["reason"], zones["heart"]["last_level"]) == (
            "unknown", "stale", "green")
        assert zones["skin"]["level"] == "green"  # the cumulative dose never goes stale


def test_one_red_reading_outside_the_critical_band_stays_with_the_crew():
    with Session(engine) as session:
        alex = _crew(session, "Alex Mercer")
        _m, alerts = record_checkin(session, alex, {"systolic_bp": 140})
        assert [(a.indicator, a.level, a.sent_to_earth) for a in alerts] == [("systolic_bp", "red", False)]
        assert "Not sent to Earth" in alerts[0].message
        assert session.exec(select(EarthMessage)).all() == []

        # it worsens into the critical band: now it is reported, once
        _m, again = record_checkin(session, alex, {"systolic_bp": 185})
        assert again == []  # same level, no duplicate alert
        messages = session.exec(select(EarthMessage)).all()
        assert len(messages) == 1
        session.refresh(alerts[0])
        assert alerts[0].sent_to_earth is True
        record_checkin(session, alex, {"systolic_bp": 190})
        assert len(session.exec(select(EarthMessage)).all()) == 1


def test_a_second_red_indicator_escalates_and_the_report_lists_both():
    with Session(engine) as session:
        alex = _crew(session, "Alex Mercer")
        record_checkin(session, alex, {"systolic_bp": 145})
        assert session.exec(select(EarthMessage)).all() == []
        record_checkin(session, alex, {"heart_rate": 118})
        messages = session.exec(select(EarthMessage)).all()
        assert len(messages) == 1
        findings = {f["indicator"] for f in json.loads(messages[0].payload)["findings"]}
        assert findings == {"systolic_bp", "heart_rate"}


def test_advice_depends_on_value_direction_and_level():
    orange = deterministic_advice("temperature", AdviceContext(level="orange", value=37.5, direction="high"))
    red = deterministic_advice(
        "temperature", AdviceContext(level="red", value=39.6, direction="high", sent_to_earth=True, round_trip_s=2400)
    )
    assert orange != red
    assert orange.startswith("Temperature 37.5 °C: above the indicative range (up to 37.2).")
    assert "medical officer" not in orange
    assert "1. Tell the crew medical officer now." in red
    assert "about 40 min" in red and "queued for Earth" in red

    low = deterministic_advice("glucose", AdviceContext(level="orange", value=60, direction="low"))
    high = deterministic_advice("glucose", AdviceContext(level="orange", value=110, direction="high"))
    assert "carbohydrate snack" in low and "fasting" in high
    for text in (orange, red, low, high):
        assert text.splitlines()[-1] == DISCLAIMER
        assert len([line for line in text.splitlines() if line[:1].isdigit()]) <= 4
        assert passes_guardrails("\n".join(line for line in text.splitlines() if line[:1].isdigit()))


def test_llm_output_guardrails():
    ok = "1. Rest and hydrate.\n2. Recheck in a few hours.\n3. See Procedure: Fever procedure."
    assert passes_guardrails(ok)
    assert not passes_guardrails(ok + "\n4. Take 500 mg of paracetamol.")
    assert not passes_guardrails("You have an infection.\n1. See Procedure: Fever procedure.")
    assert not passes_guardrails("1. a\n2. b\n3. c\n4. d\n5. See Procedure: Fever procedure.")
    assert not passes_guardrails("1. Rest.")  # no procedure reference


def test_deterministic_advice_always_ends_with_disclaimer_and_a_procedure():
    for indicator in ["heart_rate", "temperature", "exercise_streak", "mood"]:
        text = deterministic_advice(indicator)
        lines = text.splitlines()
        assert lines[-1] == DISCLAIMER
        assert "Procedure:" in text
        numbered_steps = [line for line in lines if line[:1].isdigit()]
        assert len(numbered_steps) <= 4
