from sqlmodel import Session, select

from app.db import engine
from app.models import CrewMember, FoodItem, InventoryLine, Measurement, MissionContext, ShelfSlot
from app.seed import HISTORY_DAYS, reset_and_seed


def mifflin_st_jeor_need(sex: str, weight_kg: float, height_cm: float, age: int, activity: float) -> float:
    bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + (5 if sex == "M" else -161)
    return bmr * activity


def test_seed_is_reproducible():
    reset_and_seed()
    with Session(engine) as session:
        first = [m.value for m in session.exec(select(Measurement).order_by(Measurement.id))]

    reset_and_seed()
    with Session(engine) as session:
        second = [m.value for m in session.exec(select(Measurement).order_by(Measurement.id))]

    assert first == second
    assert len(first) > 0


def test_seed_creates_expected_crew_and_contexts():
    reset_and_seed()
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).all()
        contexts = session.exec(select(MissionContext)).all()
        assert len(crew) == 4
        assert len(contexts) == 4
        active = [c for c in contexts if c.active]
        assert len(active) == 1
        assert active[0].type == "mars_base"


def test_seed_history_depth():
    reset_and_seed()
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).first()
        rows = session.exec(
            select(Measurement).where(
                Measurement.crew_member_id == crew.id, Measurement.type == "heart_rate"
            )
        ).all()
        assert len(rows) == HISTORY_DAYS


def test_scripted_anomaly_chen_low_exercise_streak():
    reset_and_seed()
    with Session(engine) as session:
        chen = session.exec(select(CrewMember).where(CrewMember.name == "Chen Wei")).first()
        last_3 = session.exec(
            select(Measurement)
            .where(Measurement.crew_member_id == chen.id, Measurement.type == "exercise_min")
            .order_by(Measurement.ts.desc())
            .limit(3)
        ).all()
        assert all(m.value < 30 for m in last_3)


def test_scripted_anomaly_sofia_fever():
    reset_and_seed()
    with Session(engine) as session:
        sofia = session.exec(select(CrewMember).where(CrewMember.name == "Sofia Lindqvist")).first()
        latest_temp = session.exec(
            select(Measurement)
            .where(Measurement.crew_member_id == sofia.id, Measurement.type == "temperature")
            .order_by(Measurement.ts.desc())
        ).first()
        latest_hr = session.exec(
            select(Measurement)
            .where(Measurement.crew_member_id == sofia.id, Measurement.type == "heart_rate")
            .order_by(Measurement.ts.desc())
        ).first()
        assert latest_temp.value > 38.0
        assert latest_hr.value > 110


def test_demo_scale_autonomy_is_roughly_412_days():
    reset_and_seed()
    with Session(engine) as session:
        crew = session.exec(select(CrewMember)).all()
        daily_need = sum(
            mifflin_st_jeor_need(c.sex, c.weight_kg, c.height_cm, c.age, c.activity_factor)
            for c in crew
        )

        slots = session.exec(select(ShelfSlot)).all()
        lines = session.exec(select(InventoryLine)).all()
        lines_by_slot = {line.slot_id: line for line in lines}

        total_kcal = 0.0
        slot_a1_kcal = 0.0
        for slot in slots:
            if slot.food_item_id is None:
                continue
            food = session.get(FoodItem, slot.food_item_id)
            line = lines_by_slot[slot.id]
            kcal = food.kcal * food.units_per_lot * line.count
            total_kcal += kcal
            if slot.label == "A1":
                slot_a1_kcal = kcal

        autonomy_days = total_kcal / daily_need
        autonomy_after_removal = (total_kcal - slot_a1_kcal) / daily_need

        assert 380 <= autonomy_days <= 440
        assert 10 <= (autonomy_days - autonomy_after_removal) <= 18
