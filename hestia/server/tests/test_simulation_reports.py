"""Management simulator: reports are frozen forecasts, listed newest first."""

import pytest
from fastapi.testclient import TestClient

from app.engines.forecast import CrewProfile, ForecastInputs, simulate
from app.main import app


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr("app.main.warmup", lambda: None)
    with TestClient(app) as c:
        assert c.post("/api/demo/scenario/demo-mars").status_code == 200
        yield c


def test_report_is_saved_listed_and_read_back(client):
    assert client.get("/api/forecast/reports").json() == []
    body = {"mission_days": 500, "resupply_delay_days": 90}
    created = client.post("/api/forecast/reports", json=body)
    assert created.status_code == 201
    report = created.json()
    assert report["inputs"]["resupply_delay_days"] == 90
    assert report["context"]["crew_count"] == 4
    assert report["series"] and report["assumptions"]
    # same numbers as a live forecast with the same inputs
    live = client.post("/api/forecast", json=body).json()
    assert report["summary"] == live["summary"]

    client.post("/api/forecast/reports", json={"mission_days": 400})
    listed = client.get("/api/forecast/reports").json()
    assert [r["id"] for r in listed] == [report["id"] + 1, report["id"]]
    assert "series" not in listed[0]  # the list stays light
    assert client.get(f"/api/forecast/reports/{report['id']}").json()["summary"] == report["summary"]


def test_report_does_not_change_when_stock_changes(client):
    report = client.post("/api/forecast/reports", json={"mission_days": 500}).json()
    client.post("/api/demo/scenario/shelf-removal")
    again = client.get(f"/api/forecast/reports/{report['id']}").json()
    assert again["summary"] == report["summary"]
    assert again["context"]["stock_kcal"] == report["context"]["stock_kcal"]


def test_unknown_report_and_invalid_inputs(client):
    assert client.get("/api/forecast/reports/999").status_code == 404
    assert client.post("/api/forecast/reports", json={"ration_pct": 10}).status_code == 422
    assert client.get("/api/forecast/reports").json() == []


def _inputs(**kw):
    crew = [CrewProfile(1, "A", "M", 38, 178, 75, 1.6)]
    base = dict(crew=crew, stock_kcal=2800 * 100, radiation_msv_day=0.67, current_dose_msv=0,
                next_resupply_in_days=80)
    base.update(kw)
    return ForecastInputs(**base)


def test_days_without_food_counts_a_second_shortage_after_the_cargo():
    # ~100 days of food, cargo on day 80 restores it, mission of 300 days:
    # the second stockout after the cargo must be counted, not reported as 0.
    result = simulate(_inputs(mission_days=300))
    s = result.summary
    assert s["stockout_day"] is not None and s["stockout_day"] > s["resupply_day"]
    assert s["days_without_food"] > 0


def test_days_without_food_until_a_late_cargo():
    # stock runs out before a late cargo: the gap is the days until the cargo arrives
    result = simulate(_inputs(mission_days=200, next_resupply_in_days=150))
    s = result.summary
    assert s["days_without_food"] == s["resupply_day"] - s["stockout_day"]
