import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlmodel import Session, select

from app.db import engine, reset_db
from app.models import (
    Alert,
    CrewMember,
    EarthMessage,
    FoodItem,
    Gamification,
    InventoryLine,
    InventorySnapshot,
    Measurement,
    MissionContext,
    ShelfSlot,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
SEED = 20261114  # event date, for reproducibility
HISTORY_DAYS = 90

CREW_SPEC = [
    {"name": "Alex Mercer", "sex": "M", "age": 38, "height_cm": 178, "weight_kg": 75.0,
     "activity_factor": 1.6, "avatar": "astro-1"},
    {"name": "Priya Nair", "sex": "F", "age": 34, "height_cm": 165, "weight_kg": 60.0,
     "activity_factor": 1.5, "avatar": "astro-2"},
    {"name": "Chen Wei", "sex": "M", "age": 45, "height_cm": 182, "weight_kg": 82.0,
     "activity_factor": 1.5, "avatar": "astro-3"},
    {"name": "Sofia Lindqvist", "sex": "F", "age": 29, "height_cm": 170, "weight_kg": 64.0,
     "activity_factor": 1.7, "avatar": "astro-4"},
]

SYMPTOM_LABELS = ["headache", "fatigue", "nausea", "vision blur"]


def _load_json(name: str) -> dict:
    with open(DATA_DIR / name) as f:
        return json.load(f)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def seed_mission_contexts(session: Session) -> dict[str, MissionContext]:
    ref = _load_json("nasa_reference.json")
    out = {}
    for key, cfg in ref["contexts"].items():
        context = MissionContext(
            type=key,
            label=cfg["label"],
            delay_s=cfg["delay_s_default"],
            radiation_msv_day=cfg["radiation_msv_day"],
            resupply_days=cfg.get("resupply_days"),
            active=(key == "mars_base"),
        )
        session.add(context)
        out[key] = context
    session.flush()
    return out


def seed_food_catalogue(session: Session) -> tuple[dict[str, FoodItem], list[ShelfSlot]]:
    catalogue = _load_json("food_catalogue.json")
    units_per_lot = catalogue["units_per_lot"]
    items_by_key: dict[str, FoodItem] = {}
    for item in catalogue["items"]:
        food = FoodItem(
            name=item["name"],
            kcal=item["kcal"],
            protein_g=item["protein_g"],
            carbs_g=item["carbs_g"],
            fat_g=item["fat_g"],
            mass_g=item["mass_g"],
            expiry_days=item["expiry_days"],
            units_per_lot=units_per_lot,
            note=item.get("note"),
        )
        session.add(food)
        items_by_key[item["key"]] = food
    session.flush()

    slots: list[ShelfSlot] = []
    for slot_cfg in catalogue["shelf_grid"]:
        food = items_by_key.get(slot_cfg["item"]) if slot_cfg["item"] else None
        slot = ShelfSlot(
            label=slot_cfg["label"],
            food_item_id=food.id if food else None,
            capacity=slot_cfg["capacity"],
        )
        session.add(slot)
        slots.append(slot)
    session.flush()
    return items_by_key, slots


def seed_inventory_snapshot(session: Session, slots: list[ShelfSlot]) -> None:
    catalogue = _load_json("food_catalogue.json")
    ground_truth = {s["label"]: s["ground_truth_count"] for s in catalogue["shelf_grid"]}
    snapshot = InventorySnapshot(
        ts=_now(),
        image_path="server/vision/fixtures/shelf_full.png",
        raw_json=json.dumps(ground_truth),
    )
    session.add(snapshot)
    session.flush()
    for slot in slots:
        session.add(
            InventoryLine(
                snapshot_id=snapshot.id,
                slot_id=slot.id,
                count=ground_truth[slot.label],
                confidence=1.0,
                source="simulated",
            )
        )


def _gauss_clamped(rng: random.Random, mean: float, sd: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, rng.gauss(mean, sd)))


def seed_crew_and_history(session: Session, mars_base: MissionContext) -> list[CrewMember]:
    crew_rows: list[CrewMember] = []
    for spec in CREW_SPEC:
        crew = CrewMember(**spec)
        session.add(crew)
        crew_rows.append(crew)
    session.flush()

    today = _now().replace(hour=8, minute=0, second=0, microsecond=0)

    for idx, crew in enumerate(crew_rows):
        rng = random.Random(SEED + crew.id)
        weight = crew.weight_kg
        for day in range(HISTORY_DAYS):
            ts = today - timedelta(days=HISTORY_DAYS - 1 - day)
            is_today = day == HISTORY_DAYS - 1

            systolic = _gauss_clamped(rng, 112, 6, 95, 135)
            diastolic = _gauss_clamped(rng, 72, 5, 58, 88)
            heart_rate = _gauss_clamped(rng, 65, 7, 48, 100)
            glucose = _gauss_clamped(rng, 85, 8, 65, 115)
            temperature = _gauss_clamped(rng, 36.6, 0.2, 36.0, 37.4)
            sleep_h = _gauss_clamped(rng, 7.2, 0.8, 4.5, 9.0)
            mood = max(1, min(5, round(_gauss_clamped(rng, 4.0, 0.8, 1, 5))))
            exercise_min = _gauss_clamped(rng, 45, 15, 0, 90)
            weight += rng.gauss(-0.01, 0.15)

            # Scripted anomaly (a): Chen Wei — low-exercise streak culminating today.
            if crew.name == "Chen Wei" and day >= HISTORY_DAYS - 3:
                exercise_min = rng.uniform(5, 25)

            # Scripted anomaly (b): Sofia Lindqvist — fever + elevated HR today.
            if crew.name == "Sofia Lindqvist" and is_today:
                temperature = rng.uniform(38.3, 38.7)
                heart_rate = rng.uniform(118, 130)

            radiation_dose = round(day * mars_base.radiation_msv_day, 3)

            measurements = [
                Measurement(ts=ts, crew_member_id=crew.id, type="systolic_bp",
                            value=round(systolic, 1), unit="mmHg", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="diastolic_bp",
                            value=round(diastolic, 1), unit="mmHg", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="heart_rate",
                            value=round(heart_rate, 1), unit="bpm", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="glucose",
                            value=round(glucose, 1), unit="mg/dL", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="temperature",
                            value=round(temperature, 2), unit="°C", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="sleep_h",
                            value=round(sleep_h, 1), unit="h", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="mood",
                            value=mood, unit="1-5", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="exercise_min",
                            value=round(exercise_min, 1), unit="min", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="weight",
                            value=round(weight, 1), unit="kg", source="simulated"),
                Measurement(ts=ts, crew_member_id=crew.id, type="radiation_dose_msv",
                            value=radiation_dose, unit="mSv", source="simulated"),
            ]
            if rng.random() < 0.05:
                measurements.append(
                    Measurement(ts=ts, crew_member_id=crew.id, type="symptom",
                                value=1, unit="count", source="simulated",
                                note=rng.choice(SYMPTOM_LABELS))
                )
            session.add_all(measurements)

        session.add(Gamification(crew_member_id=crew.id, streak=rng.randint(2, 14),
                                  badges_json="[]", score=rng.randint(10, 80)))

    session.flush()
    return crew_rows


def seed_scripted_alerts(session: Session, crew_rows: list[CrewMember], mars_base: MissionContext) -> None:
    now = _now()
    chen = next(c for c in crew_rows if c.name == "Chen Wei")
    sofia = next(c for c in crew_rows if c.name == "Sofia Lindqvist")

    session.add(
        Alert(
            ts=now,
            crew_member_id=chen.id,
            level="orange",
            indicator="exercise_streak",
            message="3 consecutive days below 30 min of exercise — bone-loss risk. "
                    "See Procedure: resistive exercise routine. This is not a diagnosis.",
            sent_to_earth=False,
        )
    )

    red_alert = Alert(
        ts=now,
        crew_member_id=sofia.id,
        level="red",
        indicator="temperature",
        message="Fever (>38.0°C) with elevated resting heart rate (>110 bpm). "
                 "Crew should follow onboard fever procedure. This is not a diagnosis.",
        sent_to_earth=True,
    )
    session.add(red_alert)
    session.flush()

    payload = json.dumps({
        "who": sofia.name,
        "indicators": ["temperature", "heart_rate"],
        "level": "red",
        "trend_7d": "new onset",
        "actions_taken": ["fever procedure started", "hydration advised"],
    })
    session.add(
        EarthMessage(
            created_ts=now,
            deliver_ts=now + timedelta(seconds=mars_base.delay_s),
            payload=payload[:600],
            status="queued",
            alert_id=red_alert.id,
        )
    )


def reset_and_seed() -> None:
    reset_db()
    with Session(engine) as session:
        mars_base = seed_mission_contexts(session)["mars_base"]
        _items_by_key, slots = seed_food_catalogue(session)
        seed_inventory_snapshot(session, slots)
        crew_rows = seed_crew_and_history(session, mars_base)
        seed_scripted_alerts(session, crew_rows, mars_base)
        session.commit()


def is_seeded() -> bool:
    with Session(engine) as session:
        return session.exec(select(CrewMember)).first() is not None


def main() -> None:
    reset_and_seed()
    print(f"Seeded hestia.db (seed={SEED}, {HISTORY_DAYS} days of history per crew member).")


if __name__ == "__main__":
    main()
