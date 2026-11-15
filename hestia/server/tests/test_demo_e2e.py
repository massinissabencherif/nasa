"""End-to-end smoke test of the demo script (docs/demo-script.md) through the
real HTTP API, with the mock scan so it needs neither a camera nor Ollama."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("app.main.warmup", lambda: None)  # no model load in tests
    with TestClient(app) as c:
        assert c.post("/api/demo/scenario/demo-mars").status_code == 200
        yield c


def crew_id(client, name):
    return next(c["id"] for c in client.get("/api/crew").json() if c["name"] == name)


def test_demo_script_end_to_end(client):
    # 1) context: Mars base, 4 astronauts, Earth 20 min away
    assert client.get("/health").json()["status"] == "ok"
    context = client.get("/api/context").json()
    assert context["type"] == "mars_base" and context["delay_s"] == 1200
    assert len(client.get("/api/crew").json()) == 4
    assert client.get("/api/alerts").json() == []

    # 2) check-in on mobile -> bone zone orange + exercise advice
    chen = crew_id(client, "Chen Wei")
    assert client.get(f"/api/crew/{chen}/status").json()["bones"]["level"] == "green"
    result = client.post(f"/api/crew/{chen}/checkin", json={"exercise_min": 10}).json()
    assert result["status"]["bones"]["level"] == "orange"
    advice = result["alerts"][0]
    assert advice["indicator"] == "exercise_streak" and "Resistive exercise routine" in advice["message"]
    assert "not a diagnosis" in advice["message"]

    # 3) pantry: 412 days -> remove the 3 A1 boxes -> scan -> ~398 days
    before = client.get("/api/pantry").json()["autonomy_days"]
    assert 405 <= before <= 420
    scan = client.post("/api/pantry/scan", params={"mode": "mock", "variant": "after_removal"}).json()
    after = client.get("/api/pantry").json()["autonomy_days"]
    assert scan["autonomy_days"] == after
    assert 12 <= before - after <= 16
    feed = client.get("/api/pantry/consumption").json()
    assert feed[0]["qty"] == -3 and feed[0]["food_name"] == "Tomato soup can"

    # 4) resupply delayed 60 days -> rationing plan + weight curve
    forecast = client.post(
        "/api/forecast", json={"mission_days": 460, "resupply_delay_days": 60}
    ).json()
    assert forecast["summary"]["resupply_day"] == 440
    assert forecast["summary"]["stockout_day"] is not None
    need_pct = forecast["summary"]["required_ration_pct"]
    assert 85 < need_pct < 95
    rationed = client.post(
        "/api/forecast",
        json={"mission_days": 460, "resupply_delay_days": 60, "ration_pct": need_pct - 0.2},
    ).json()
    assert rationed["summary"]["stockout_day"] is None
    assert rationed["summary"]["weight_change_pct_final"] < 0
    assert len(rationed["series"]) > 20 and rationed["assumptions"]

    # 5) red alert -> compact Earth report, 20 min away
    assert client.post("/api/demo/scenario/red-alert").status_code == 200
    reds = [a for a in client.get("/api/alerts").json() if a["level"] == "red"]
    assert reds and all(a["sent_to_earth"] for a in reds)
    messages = client.get("/api/earth/messages").json()
    assert messages and messages[0]["status"] == "queued" and messages[0]["reply_payload"] is None
    client.post("/api/earth/advance", params={"seconds": 1200})
    assert client.get("/api/earth/messages").json()[0]["status"] == "delivered"
    client.post("/api/earth/advance", params={"seconds": 1200})
    replied = client.get("/api/earth/messages").json()[0]
    assert replied["status"] == "replied" and "SIMULATED" in replied["reply_payload"]
    # skipping ahead keeps the order of events: sent, then received, then answered
    assert replied["created_ts"] < replied["deliver_ts"] < replied["reply_ts"]


def test_context_switch_changes_delay_radiation_resupply(client):
    client.put("/api/context", json={"time_scale": 30})
    moon = client.put("/api/context", json={"type": "moon_base"}).json()
    assert (moon["delay_s"], moon["radiation_msv_day"], moon["next_resupply_in_days"]) == (1, 1.369, 120)
    assert moon["time_scale"] == 30  # demo settings survive a context switch
    forecast = client.post("/api/forecast", json={"mission_days": 200}).json()
    assert forecast["context"]["type"] == "moon_base"
    assert forecast["summary"]["resupply_day"] == 120


def test_confirming_a_slot_corrects_stock_and_feed(client):
    client.post("/api/pantry/scan", params={"mode": "mock", "variant": "after_removal"})
    fixed = client.post("/api/pantry/confirm", json={"slot": "A1", "count": 1}).json()
    assert fixed["source"] == "manual"
    pantry = client.get("/api/pantry").json()
    a1 = next(s for s in pantry["slots"] if s["slot"] == "A1")
    assert a1["count"] == 1 and a1["source"] == "manual" and not a1["needs_confirmation"]
    assert client.get("/api/pantry/consumption").json()[0]["qty"] == -2


def test_a_meal_consumes_one_real_package_regardless_of_demo_scale(client):
    alex = crew_id(client, "Alex Mercer")
    meal = client.get(f"/api/crew/{alex}/meal").json()
    soup = next(i for i in meal["available"] if i["name"] == "Tomato soup can")
    assert meal["suggestion"]
    assert soup["available_count"] == soup["available_portions"] == 3
    before = client.get("/api/pantry").json()
    for _ in range(3):
        assert client.post(f"/api/crew/{alex}/meal", json={"food_item_id": soup["food_item_id"]}).status_code == 200
    after = client.get("/api/pantry").json()
    assert before["stock_kcal"] - after["stock_kcal"] == pytest.approx(3 * 212 * soup["kcal"])
    assert before["counted_package_kcal"] - after["counted_package_kcal"] == pytest.approx(3 * soup["kcal"])
    assert client.post(f"/api/crew/{alex}/meal", json={"food_item_id": soup["food_item_id"]}).status_code == 400
    assert client.get(f"/api/crew/{alex}/meal").json()["kcal_eaten_today"] == pytest.approx(3 * soup["kcal"])
    client.post("/api/pantry/scan", params={"mode": "mock", "variant": "after_removal"})
    assert next(s['count'] for s in client.get('/api/pantry').json()['slots'] if s['slot'] == 'A1') == 0


def test_gamification_reminders_station_info_and_validation(client):
    priya = crew_id(client, "Priya Nair")
    before = client.get(f"/api/crew/{priya}/gamification").json()
    client.post(f"/api/crew/{priya}/checkin", json={
        "systolic_bp": 110, "heart_rate": 62, "temperature": 36.6, "exercise_min": 45,
    })
    after = client.get(f"/api/crew/{priya}/gamification").json()
    assert after["streak"] == before["streak"] + 1 and after["score"] == before["score"] + 15
    reminders = {r["key"]: r for r in client.get(f"/api/crew/{priya}/reminders").json()}
    assert reminders["measurements"]["done"] and reminders["exercise"]["done"]
    assert "context" in reminders

    assert client.post(f"/api/crew/{priya}/checkin", json={"temperature": 99}).status_code == 422
    assert client.post(f"/api/crew/{priya}/checkin", json={}).status_code == 400
    assert client.post("/api/pantry/scan", params={"mode": "image", "image_path": "/etc/hosts"}).status_code == 400

    info = client.get("/api/station/info").json()
    assert info["crew_url"].endswith("/crew/")
    qr = client.get("/api/station/qr.svg")
    assert qr.status_code == 200 and "<svg" in qr.text


def test_phone_photo_reference_frame_calibration_and_slot_assignment(client, tmp_path, monkeypatch):
    import cv2
    import numpy as np

    from app.routes import pantry
    from vision import grid

    monkeypatch.setattr(pantry, "CAPTURES_DIR", pantry.SERVER_DIR / "captures" / "test")
    grid_copy = tmp_path / "shelf_grid.json"
    grid_copy.write_text(grid.GRID_PATH.read_text())
    monkeypatch.setattr(grid, "GRID_PATH", grid_copy)

    ok, jpg = cv2.imencode(".jpg", np.full((600, 800, 3), 127, dtype=np.uint8))
    before = client.get("/api/pantry").json()

    # a photo used only as the reference picture keeps the counts
    r = client.post("/api/pantry/photo", params={"scan": "false"}, files={"file": ("p.jpg", jpg.tobytes(), "image/jpeg")})
    assert r.status_code == 200 and r.json()["mode"] == "reference"
    after = client.get("/api/pantry").json()
    assert after["autonomy_days"] == before["autonomy_days"]
    assert client.get("/api/pantry/snapshot-image").headers["content-type"] == "image/jpeg"
    assert client.post("/api/pantry/photo", files={"file": ("x.txt", b"not an image", "text/plain")}).status_code == 400

    # frame calibration: 12 equal slots inside the given frame
    boxes = client.put("/api/pantry/grid-frame", json={"left": 0.1, "top": 0.2, "right": 0.9, "bottom": 0.8}).json()
    assert len(boxes) == 12 and boxes["A1"] == [0.1, 0.2, 0.3, 0.4] and boxes["C4"] == [0.7, 0.6, 0.9, 0.8]

    # a real product can be added and assigned to a slot; the model is told about it
    item = client.post("/api/pantry/items", json={"name": "Lentil can", "kcal": 300}).json()
    assert client.put("/api/pantry/grid", json={"label": "A4", "food_item_id": item["id"], "capacity": 5}).status_code == 200
    assert client.put("/api/pantry/grid", json={"label": "A1", "food_item_id": 0}).status_code == 200
    expected, capacities = pantry._slot_expectations()
    assert expected["A4"]["name"] == "Lentil can" and capacities["A4"] == 5 and expected["A1"] is None
    assert expected["A3"]["stacked"] is True

    for f in (pantry.SERVER_DIR / "captures" / "test").glob("*.jpg"):
        f.unlink()
