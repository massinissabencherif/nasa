from datetime import datetime, timezone

import pytest
from sqlmodel import Session, select

from app.db import engine
from app.engines.nutrition import (
    autonomy_report,
    available_items,
    bmr,
    crew_daily_need,
    current_stock,
    kcal_eaten_today,
    rationing_plan,
)
from app.models import ConsumptionEvent, CrewMember
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


def test_available_items_use_raw_per_unit_kcal_not_demo_scale():
    with Session(engine) as session:
        items = {item.name: item for item in available_items(session)}
    assert items["Tomato soup can"].kcal == pytest.approx(212)
    assert items["Tomato soup can"].available_count == 3


def test_eating_a_meal_decrements_pending_stock_before_next_scan():
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).first()
        before = current_stock(session).kcal
        tomato_soup_id = next(
            item.food_item_id for item in available_items(session) if item.name == "Tomato soup can"
        )
        session.add(
            ConsumptionEvent(
                ts=datetime.now(timezone.utc),
                food_item_id=tomato_soup_id,
                qty=-1,
                crew_member_id=crew.id,
            )
        )
        session.commit()

        after = current_stock(session).kcal
        catalogue_kcal = next(
            item.kcal for item in available_items(session) if item.food_item_id == tomato_soup_id
        )
        # a meal is one real portion, not a whole demo lot of 212 portions
        assert before - after == pytest.approx(catalogue_kcal)


def test_kcal_eaten_today_counts_only_this_crew_members_meals():
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).all()
        alex, priya = crew[0], crew[1]
        tomato_soup_id = next(
            item.food_item_id for item in available_items(session) if item.name == "Tomato soup can"
        )
        now = datetime.now(timezone.utc)
        session.add(ConsumptionEvent(ts=now, food_item_id=tomato_soup_id, qty=-1, crew_member_id=alex.id))
        session.commit()

        assert kcal_eaten_today(session, alex.id, now.replace(hour=0, minute=0, second=0)) == pytest.approx(212)
        assert kcal_eaten_today(session, priya.id, now.replace(hour=0, minute=0, second=0)) == 0
