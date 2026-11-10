from datetime import datetime, timezone

import pytest
from sqlmodel import Session, select

from app.db import engine
from app.engines.advice import DISCLAIMER, deterministic_advice
from app.engines.alerts import evaluate_and_alert
from app.models import Alert, CrewMember, EarthMessage, Measurement
from app.seed import reset_and_seed


@pytest.fixture(autouse=True)
def seeded_db():
    reset_and_seed()
    yield


def test_scripted_anomalies_produce_the_expected_alerts():
    with Session(engine) as session:
        chen = session.exec(select(CrewMember).where(CrewMember.name == "Chen Wei")).first()
        sofia = session.exec(select(CrewMember).where(CrewMember.name == "Sofia Lindqvist")).first()

        chen_alerts = session.exec(select(Alert).where(Alert.crew_member_id == chen.id)).all()
        sofia_alerts = session.exec(select(Alert).where(Alert.crew_member_id == sofia.id)).all()

    assert any(a.indicator == "exercise_streak" and a.level == "orange" for a in chen_alerts)
    assert any(a.level == "red" for a in sofia_alerts)
    assert all(not a.sent_to_earth for a in chen_alerts if a.level == "orange")


def test_red_alert_queues_an_earth_message_with_delay():
    with Session(engine) as session:
        sofia = session.exec(select(CrewMember).where(CrewMember.name == "Sofia Lindqvist")).first()
        red_alert = session.exec(
            select(Alert).where(Alert.crew_member_id == sofia.id, Alert.level == "red")
        ).first()
        message = session.exec(
            select(EarthMessage).where(EarthMessage.alert_id == red_alert.id)
        ).first()

    assert message is not None
    assert (message.deliver_ts - message.created_ts).total_seconds() == pytest.approx(1200, abs=1)
    assert "SIMULATED" in message.reply_payload


def test_unchanged_level_does_not_create_a_duplicate_alert():
    with Session(engine) as session:
        chen = session.exec(select(CrewMember).where(CrewMember.name == "Chen Wei")).first()
        before = len(session.exec(select(Alert).where(Alert.crew_member_id == chen.id)).all())

        created = evaluate_and_alert(session, chen.id)
        session.commit()

        after = len(session.exec(select(Alert).where(Alert.crew_member_id == chen.id)).all())

    assert created == []
    assert before == after


def test_level_change_creates_a_new_alert():
    with Session(engine) as session:
        priya = session.exec(select(CrewMember).where(CrewMember.name == "Priya Nair")).first()
        # Priya is seeded healthy; push her heart rate into the red band.
        session.add(
            Measurement(
                ts=datetime.now(timezone.utc), crew_member_id=priya.id, type="heart_rate",
                value=150, unit="bpm", source="manual",
            )
        )
        session.commit()

        created = evaluate_and_alert(session, priya.id)
        session.commit()
        created_pairs = [(a.indicator, a.level) for a in created]

    assert ("heart_rate", "red") in created_pairs


def test_deterministic_advice_always_ends_with_disclaimer_and_a_procedure():
    for indicator in ["heart_rate", "temperature", "exercise_streak", "mood"]:
        text = deterministic_advice(indicator)
        lines = text.splitlines()
        assert lines[-1] == DISCLAIMER
        assert "Procedure:" in text
        numbered_steps = [line for line in lines if line[:1].isdigit()]
        assert len(numbered_steps) <= 4
