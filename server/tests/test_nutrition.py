import pytest
from sqlmodel import Session

from app.db import engine
from app.engines.nutrition import autonomy_report, bmr, crew_daily_need, rationing_plan
from app.seed import reset_and_seed


def test_bmr_male_formula():
    # 75 kg, 178 cm, 38 y -> 10*75 + 6.25*178 - 5*38 + 5
    assert bmr("M", 75, 178, 38) == pytest.approx(1677.5)


def test_bmr_female_formula():
    # 60 kg, 165 cm, 34 y -> 10*60 + 6.25*165 - 5*34 - 161
    assert bmr("F", 60, 165, 34) == pytest.approx(1300.25)


@pytest.fixture(autouse=True)
def seeded_db():
    reset_and_seed()
    yield


def test_crew_daily_need_matches_seeded_crew():
    with Session(engine) as session:
        need = crew_daily_need(session)
    assert 9000 < need < 10500


def test_autonomy_report_is_roughly_412_days():
    with Session(engine) as session:
        report = autonomy_report(session)
    assert 380 <= report.autonomy_days <= 440
    assert report.expiry_warning is False


def test_rationing_plan_full_ration_at_412_days():
    with Session(engine) as session:
        plan = rationing_plan(session, target_days=380)
    assert plan.ration_pct == pytest.approx(100.0, abs=0.01)
    assert plan.below_safety_floor is False
    for change in plan.projected_weight_change_kg_per_crew.values():
        assert change == pytest.approx(0.0, abs=0.01)


def test_rationing_plan_below_safety_floor_for_very_long_target():
    with Session(engine) as session:
        plan = rationing_plan(session, target_days=1000)
    assert plan.ration_pct < 70
    assert plan.below_safety_floor is True
    for change in plan.projected_weight_change_kg_per_crew.values():
        assert change < 0
