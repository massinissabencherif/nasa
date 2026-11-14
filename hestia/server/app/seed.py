import json
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlmodel import Session, select

from app.db import engine, reset_db
from app.engines.alerts import evaluate_and_alert
from app.models import (
    CrewMember,
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
QUIET_DAYS = 3  # most recent seeded days are kept green (see seed_crew_and_history)
PRIMED_LOW_EXERCISE = "Chen Wei"
SCRIPTED_RED = "Sofia Lindqvist"

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
            next_resupply_in_days=cfg.get("next_resupply_in_days"),
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
        image_path="vision/fixtures/shelf_full.png",
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

    # History covers the 90 days *before* today (latest row = yesterday 12:00 UTC).
    # Today is deliberately empty: it is filled by a live check-in from the crew
    # app or by a demo scenario, so the demo shows the system reacting.
    anchor = _now().replace(hour=12, minute=0, second=0, microsecond=0)

    for crew in crew_rows:
        rng = random.Random(SEED + crew.id)
        # separate generator: adding the reaction test must not shift the other series
        reaction_rng = random.Random(SEED + 1000 + crew.id)
        reaction_mean = reaction_rng.uniform(285, 325)
        weight = crew.weight_kg
        for day in range(HISTORY_DAYS):
            days_ago = HISTORY_DAYS - day
            ts = anchor - timedelta(days=days_ago)

            systolic = _gauss_clamped(rng, 112, 6, 95, 135)
            diastolic = _gauss_clamped(rng, 72, 5, 58, 88)
            heart_rate = _gauss_clamped(rng, 65, 7, 48, 100)
            glucose = _gauss_clamped(rng, 85, 8, 65, 115)
            temperature = _gauss_clamped(rng, 36.6, 0.2, 36.0, 37.4)
            sleep_h = _gauss_clamped(rng, 7.2, 0.8, 4.5, 9.0)
            mood = max(1, min(5, round(_gauss_clamped(rng, 4.0, 0.8, 1, 5))))
            exercise_min = _gauss_clamped(rng, 45, 15, 0, 90)
            weight += rng.gauss(-0.008, 0.045)

            if days_ago <= QUIET_DAYS:
                # Keep the most recent days inside the green bands so the demo starts
                # from a calm baseline and every colour change on stage is caused live.
                systolic = min(max(systolic, 96), 118)
                diastolic = min(max(diastolic, 62), 78)
                heart_rate = min(max(heart_rate, 54), 88)
                glucose = min(max(glucose, 72), 98)
                temperature = min(max(temperature, 36.2), 37.1)
                sleep_h = max(sleep_h, 7.1)
                mood = max(mood, 4)
                exercise_min = max(exercise_min, 35)

            # Primed anomaly (a): Chen Wei skipped exercise the last two days. One more
            # low day — today's check-in — turns his bone zone orange.
            if crew.name == PRIMED_LOW_EXERCISE and days_ago <= 2:
                exercise_min = rng.uniform(8, 22)

            radiation_dose = round(day * mars_base.radiation_msv_day, 3)

            rows = [
                ("systolic_bp", round(systolic, 1), "mmHg"),
                ("diastolic_bp", round(diastolic, 1), "mmHg"),
                ("heart_rate", round(heart_rate, 1), "bpm"),
                ("glucose", round(glucose, 1), "mg/dL"),
                ("temperature", round(temperature, 2), "°C"),
                ("sleep_h", round(sleep_h, 1), "h"),
                ("mood", mood, "1-5"),
                ("exercise_min", round(exercise_min, 1), "min"),
                ("weight", round(weight, 1), "kg"),
                ("radiation_dose_msv", radiation_dose, "mSv"),
                # reaction self-test: stays within a few percent of the personal mean,
                # so the seeded baseline is calm and a slow live test stands out
                ("reaction_ms", round(reaction_mean * reaction_rng.uniform(0.94, 1.06)), "ms"),
            ]
            measurements = [
                Measurement(ts=ts, crew_member_id=crew.id, type=t, value=v, unit=u, source="simulated")
                for t, v, u in rows
            ]
            if days_ago > QUIET_DAYS and rng.random() < 0.05:
                measurements.append(
                    Measurement(ts=ts, crew_member_id=crew.id, type="symptom",
                                value=1, unit="count", source="simulated",
                                note=rng.choice(SYMPTOM_LABELS))
                )
            session.add_all(measurements)

        session.add(Gamification(
            crew_member_id=crew.id, streak=rng.randint(2, 14), badges_json="[]",
            score=rng.randint(10, 80),
            last_checkin_date=(anchor - timedelta(days=1)).date().isoformat(),
        ))

    session.flush()
    return crew_rows


def seed_scripted_alerts(session: Session, crew_rows: list[CrewMember]) -> None:
    """Run the real alert engine over the seeded history (no hand-written
    Alert rows). With the quiet baseline this normally creates nothing; the
    scripted anomalies are triggered live, see app/routes/demo.py."""
    for crew in crew_rows:
        evaluate_and_alert(session, crew.id)


def reset_and_seed() -> None:
    reset_db()
    with Session(engine) as session:
        mars_base = seed_mission_contexts(session)["mars_base"]
        _items_by_key, slots = seed_food_catalogue(session)
        seed_inventory_snapshot(session, slots)
        crew_rows = seed_crew_and_history(session, mars_base)
        seed_scripted_alerts(session, crew_rows)
        session.commit()


def is_seeded() -> bool:
    with Session(engine) as session:
        return session.exec(select(CrewMember)).first() is not None


def main() -> None:
    reset_and_seed()
    print(f"Seeded hestia.db (seed={SEED}, {HISTORY_DAYS} days of history per crew member).")


if __name__ == "__main__":
    main()
