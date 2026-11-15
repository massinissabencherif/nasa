"""The wait for Earth: onboard plan, what Earth reads vs on board now, rules
to act without waiting, an update, and a reply built from what was sent."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("app.main.warmup", lambda: None)
    with TestClient(app) as c:
        assert c.post("/api/demo/scenario/demo-mars").status_code == 200
        assert c.post("/api/demo/scenario/red-alert").status_code == 200
        yield c


def sofia(client):
    return next(c["id"] for c in client.get("/api/crew").json() if c["name"].startswith("Sofia"))


def report(client):
    return next(m for m in client.get("/api/earth/messages").json() if m["kind"] == "report")


def test_report_has_a_plan_rules_and_the_onboard_view(client):
    msg = report(client)
    assert msg["crew_member_id"] == sofia(client)
    labels = [s["label"] for s in msg["plan"]]
    assert labels[0] == "Tell the crew medical officer"
    assert labels[-1] == "Measure again and log it"
    assert all(s["done_ts"] is None for s in msg["plan"])
    # the rules come from the critical bands of demo_rules.json
    texts = [r["text"] for r in msg["dont_wait"]["rules"]]
    assert any("temperature" in t and "39.5" in t for t in texts)
    assert msg["dont_wait"]["triggered"] is False
    now = {r["indicator"]: r for r in msg["onboard_now"]}
    assert now["temperature"]["value"] == now["temperature"]["sent_value"]
    assert now["temperature"]["change"] == "same"


def test_reply_quotes_what_earth_received(client):
    client.post("/api/earth/advance?seconds=2400")
    msg = report(client)
    assert msg["status"] == "replied"
    assert "38.6" in msg["reply_payload"] and "SIMULATED" in msg["reply_payload"]
    assert "evacuation" not in msg["reply_payload"].lower()


def test_ticking_a_step_records_the_time(client):
    step = report(client)["plan"][0]
    done = client.post(f"/api/earth/steps/{step['id']}", json={"done": True}).json()
    assert done["done_ts"] is not None
    undone = client.post(f"/api/earth/steps/{step['id']}", json={"done": False}).json()
    assert undone["done_ts"] is None


def test_update_compares_with_what_was_sent_and_gets_its_own_reply(client):
    msg = report(client)
    client.post(f"/api/earth/steps/{msg['plan'][0]['id']}", json={"done": True})
    crew_id = sofia(client)
    # temperature comes down on board
    client.post(f"/api/crew/{crew_id}/checkin", json={"temperature": 37.8, "heart_rate": 95})
    preview = client.get(f"/api/earth/messages/{msg['id']}/update").json()
    temp = next(f for f in preview["findings"] if f["indicator"] == "temperature")
    assert temp["previous"] == 38.6 and temp["value"] == 37.8 and temp["change"] == "better"
    assert "Tell the crew medical officer" in preview["summary"]
    assert len(preview["summary"]) <= 600
    sent = client.post(f"/api/earth/messages/{msg['id']}/update")
    assert sent.status_code == 201 and sent.json()["kind"] == "update"
    client.post("/api/earth/advance?seconds=2400")
    update = next(m for m in client.get("/api/earth/messages").json() if m["kind"] == "update")
    assert update["parent_id"] == msg["id"]
    assert "improving" in update["reply_payload"]


def test_dont_wait_triggers_on_a_critical_value(client):
    msg = report(client)
    client.post(f"/api/crew/{sofia(client)}/checkin", json={"temperature": 39.8})
    after = next(m for m in client.get("/api/earth/messages").json() if m["id"] == msg["id"])
    assert after["dont_wait"]["triggered"] is True


def test_update_of_unknown_report_is_404(client):
    assert client.post("/api/earth/messages/999/update").status_code == 404


def test_report_keeps_sending_mission_and_update_records_its_own(client):
    original = report(client)
    assert original['mission_context']['type'] == 'mars_base'
    client.put('/api/context', json={'type': 'iss'})
    frozen = next(m for m in client.get('/api/earth/messages').json() if m['id'] == original['id'])
    assert frozen['mission_context'] == original['mission_context']
    assert frozen['deliver_ts'] == original['deliver_ts']
    update = client.post(f"/api/earth/messages/{original['id']}/update").json()
    assert update['mission_context']['type'] == 'iss'


def test_legacy_report_without_sending_mission_stays_unknown(client):
    import json
    from sqlmodel import Session
    from app.db import engine
    from app.models import EarthMessage
    original = report(client)
    with Session(engine) as session:
        message = session.get(EarthMessage, original['id'])
        payload = json.loads(message.payload)
        payload.pop('mission_context', None)
        message.payload = json.dumps(payload)
        session.add(message)
        session.commit()
    client.put('/api/context', json={'type': 'iss'})
    legacy = next(m for m in client.get('/api/earth/messages').json() if m['id'] == original['id'])
    assert legacy['mission_context'] is None
