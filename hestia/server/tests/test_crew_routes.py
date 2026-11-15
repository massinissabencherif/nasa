import pytest
from sqlmodel import Session, select

from app.db import engine
from app.models import CrewMember
from app.routes.crew import get_latest_measurements
from app.seed import reset_and_seed


@pytest.fixture(autouse=True)
def seeded_db():
    reset_and_seed()
    yield


def test_latest_measurements_returns_one_row_per_type():
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).first()
    latest = get_latest_measurements(crew.id)
    assert "heart_rate" in latest
    assert "weight" in latest
    assert set(latest["heart_rate"].keys()) == {"value", "unit", "ts"}


def test_latest_measurements_unknown_crew_404s():
    with pytest.raises(Exception):
        get_latest_measurements(999999)


def test_station_code_can_open_the_shelf_photo_directly(monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app

    monkeypatch.setattr("app.main.warmup", lambda: None)
    with TestClient(app) as client:
        info = client.get("/api/station/info").json()
        assert info["crew_photo_url"].endswith("/crew/#/pantry?photo=1")
        assert client.get("/api/station/qr.svg?target=pantry_photo").status_code == 200
        assert client.get("/api/station/qr.svg?target=elsewhere").status_code == 400
