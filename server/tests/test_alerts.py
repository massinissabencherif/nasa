import json

import pytest
from sqlmodel import Session, select

from app.db import engine
from app.engines.advice import DISCLAIMER, deterministic_advice, passes_guardrails
from app.engines.checkin import record_checkin
from app.engines.status import crew_status
from app.models import Alert, CrewMember, EarthMessage
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
        message = session.exec(
            select(EarthMessage).where(EarthMessage.alert_id == reds["temperature"].id)
        ).first()

    assert (message.deliver_ts - message.created_ts).total_seconds() == pytest.approx(1200, abs=1)
    assert (message.reply_ts - message.deliver_ts).total_seconds() == pytest.approx(1200, abs=1)
    assert "SIMULATED" in message.reply_payload
    payload = json.loads(message.payload)
    assert payload["who"] == "Sofia Lindqvist" and payload["level"] == "red"
    assert len(payload["summary"]) <= 600 and payload["actions_taken"]


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
