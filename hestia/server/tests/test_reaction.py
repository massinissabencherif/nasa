from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, delete

from app.db import engine, init_db
from app.engines import reaction
from app.main import app
from app.models import Measurement, ReactionSession, ReactionTrial


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("app.main.warmup", lambda: None)
    with TestClient(app) as client:
        client.post("/api/demo/scenario/demo-mars")
        with Session(engine) as session:
            session.exec(delete(ReactionTrial))
            session.exec(delete(ReactionSession))
            session.commit()
        yield client


def payload(*, device=None, status="complete", days_ago=0, times=None):
    start = datetime.now(timezone.utc) - timedelta(days=days_ago, minutes=3)
    return {
        "id": str(uuid4()), "device_id": device or str(uuid4()),
        "protocol_version": "reaction-15-v1", "practice_completed": 3,
        "status": status, "source": "manual", "started_at": start.isoformat(),
        "ended_at": (start + timedelta(seconds=80)).isoformat(),
        "trials": [{"trial_number": i + 1, "outcome": "valid", "reaction_ms": value}
                   for i, value in enumerate(times or [250 + i * 10 for i in range(15)])],
    }


def path(client):
    return f'/api/crew/{client.get("/api/crew").json()[0]["id"]}/reaction-sessions'


def test_raw_attempts_statistics_and_idempotency(client, monkeypatch):
    events = []
    monkeypatch.setattr("app.routes.reaction.publish_event", events.append)
    body = payload()
    body["trials"][4] = {"trial_number": 5, "outcome": "no_response"}
    body["trials"].insert(0, {"trial_number": 1, "outcome": "false_start"})
    response = client.post(path(client), json=body)
    assert response.status_code == 201
    saved = response.json()
    assert saved["median_ms"] == 325
    assert (saved["valid_responses"], saved["false_starts"], saved["no_responses"]) == (14, 1, 1)
    assert len(saved["trials"]) == 16 and saved["ended_at"].endswith("Z")
    assert "request_hash" not in saved
    retry = client.post(path(client), json=body)
    assert retry.status_code == 200 and retry.json() == saved
    assert len(client.get(path(client)).json()) == 1
    assert len(events) == 1 and set(events[0]) == {"type", "crew_member_id"}
    body["trials"][-1]["reaction_ms"] = 900
    assert client.post(path(client), json=body).status_code == 409


def test_validation_does_not_trust_aggregates_or_malformed_attempts(client):
    original = payload()
    invalid = []
    forged = deepcopy(original)
    forged["median_ms"] = 12
    invalid.append(forged)
    for key, value in [("protocol_version", "unknown"), ("practice_completed", 0),
                       ("device_id", "fingerprint"), ("ended_at", "2000-01-01T00:00:00Z")]:
        body = deepcopy(original)
        body[key] = value
        invalid.append(body)
    for attempt in [
        {"trial_number": 2, "outcome": "valid", "reaction_ms": 200},
        {"trial_number": 1, "outcome": "valid", "reaction_ms": 3000},
        {"trial_number": 1, "outcome": "valid", "reaction_ms": -1},
        {"trial_number": 1, "outcome": "valid", "reaction_ms": True},
        {"trial_number": 1, "outcome": "valid"},
        {"trial_number": 1, "outcome": "no_response", "reaction_ms": 200},
        {"trial_number": 1, "outcome": "interrupted"},
    ]:
        body = deepcopy(original)
        body["trials"][0] = attempt
        invalid.append(body)
    short = deepcopy(original)
    short["trials"].pop()
    invalid.append(short)
    oversized = deepcopy(original)
    oversized["trials"] = [{"trial_number": 1, "outcome": "false_start"}] * 129
    invalid.append(oversized)
    for body in invalid:
        assert client.post(path(client), json=body).status_code == 422, body
    assert client.get(path(client)).json() == []


def test_reference_only_five_previous_comparable_complete_sessions(client, monkeypatch):
    protocol = reaction.protocols()
    other_protocol = deepcopy(protocol["protocols"]["reaction-15-v1"])
    other_protocol["version"] = "other-version"
    protocol["protocols"]["other-version"] = other_protocol
    monkeypatch.setattr(reaction, "protocols", lambda: protocol)
    device = str(uuid4())
    endpoint = path(client)
    for i, value in enumerate([800, 280, 290, 300, 310, 320]):
        body = payload(device=device, days_ago=10-i, times=[value] * 15)
        assert client.post(endpoint, json=body).status_code == 201
    for variant in ("device", "protocol", "source", "interrupted", "abandoned", "no_response"):
        body = payload(device=device, days_ago=1, times=[1200] * 15)
        if variant == "device": body["device_id"] = str(uuid4())
        if variant == "protocol": body["protocol_version"] = "other-version"
        if variant == "source": body["source"] = "simulated"
        if variant in ("interrupted", "abandoned"):
            body["status"] = variant
            body["trials"] = body["trials"][:3]
        if variant == "no_response":
            body["trials"] = [{"trial_number": i+1, "outcome": "no_response"} for i in range(15)]
        assert client.post(endpoint, json=body).status_code == 201
    current = client.post(endpoint, json=payload(device=device, times=[335] * 15)).json()
    assert current["reference"]["count"] == 5
    assert current["reference"]["median_ms"] == 300
    assert current["reference"]["difference_ms"] == 35
    assert current["reference"]["difference_pct"] == pytest.approx(35/300*100)
    listed = client.get(endpoint, params={"device_id": device, "limit": 2}).json()
    assert len(listed) == 2 and all(row["device_id"] == device for row in listed)


def test_building_reference_and_no_device_do_not_invent_a_baseline(client):
    device = str(uuid4())
    for days in range(4, -1, -1):
        saved = client.post(path(client), json=payload(device=device, days_ago=days)).json()
        assert saved["reference"]["count"] == 4-days
        assert saved["reference"]["median_ms"] is None
    body = payload()
    body["device_id"] = None
    assert client.post(path(client), json=body).json()["reference"]["median_ms"] is None


def test_interrupted_practice_and_zero_responses_have_no_fake_time(client):
    body = payload(status="interrupted")
    body.update(practice_completed=1, trials=[])
    saved = client.post(path(client), json=body).json()
    assert saved["status"] == "interrupted" and saved["median_ms"] is None
    body = payload()
    body["trials"] = [{"trial_number": i+1, "outcome": "no_response"} for i in range(15)]
    saved = client.post(path(client), json=body).json()
    assert saved["median_ms"] is None and saved["no_responses"] == 15


def test_ownership_and_no_colour_alert_or_earth_side_effect(client):
    crew = client.get("/api/crew").json()
    endpoint = path(client)
    zones_before = client.get(f'/api/crew/{crew[0]["id"]}/status').json()
    alerts_before = client.get("/api/alerts").json()
    earth_before = client.get("/api/earth/messages").json()
    body = payload(times=[2900] * 15)
    saved = client.post(endpoint, json=body).json()
    assert client.get(f'{endpoint}/{saved["id"]}').status_code == 200
    other = f'/api/crew/{crew[1]["id"]}/reaction-sessions'
    assert client.get(f'{other}/{saved["id"]}').status_code == 404
    assert client.post(other, json=body).status_code == 409
    assert client.get("/api/crew/999999/reaction-sessions").status_code == 404
    assert client.get(f'/api/crew/{crew[0]["id"]}/status').json() == zones_before
    assert client.get("/api/alerts").json() == alerts_before
    assert client.get("/api/earth/messages").json() == earth_before


def test_initialisation_is_additive_and_does_not_erase_existing_data(client):
    with Session(engine) as session:
        measurement = session.exec(select(Measurement)).first()
        original = measurement.model_dump()
    saved = client.post(path(client), json=payload()).json()
    init_db()
    with Session(engine) as session:
        assert session.get(Measurement, original["id"]).model_dump() == original
        assert session.get(ReactionSession, saved["id"]) is not None


def test_offset_dates_are_normalised_before_storage_and_idempotency(client):
    body = payload()
    offset = timezone(timedelta(hours=2))
    body["started_at"] = datetime.fromisoformat(body["started_at"]).astimezone(offset).isoformat()
    body["ended_at"] = datetime.fromisoformat(body["ended_at"]).astimezone(offset).isoformat()
    saved = client.post(path(client), json=body).json()
    assert saved["started_at"].endswith("Z")
    body["started_at"] = saved["started_at"]
    body["ended_at"] = saved["ended_at"]
    assert client.post(path(client), json=body).status_code == 200


def test_demo_sessions_are_explicitly_simulated_and_incomplete_session_is_excluded(client):
    client.post("/api/demo/scenario/demo-mars")
    rows = client.get(path(client)).json()
    assert len(rows) == 7 and all(row["source"] == "simulated" for row in rows)
    assert rows[0]["reference"]["count"] == 5
    assert rows[1]["status"] == "interrupted" and rows[1]["reference"]["median_ms"] is None
