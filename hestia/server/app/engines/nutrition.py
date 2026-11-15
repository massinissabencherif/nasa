from dataclasses import dataclass
import json

from sqlmodel import Session, select

from app.models import (
    ConsumptionEvent,
    CrewMember,
    FoodItem,
    InventoryLine,
    InventorySnapshot,
    ShelfSlot,
    MealCancellation,
)

KCAL_PER_KG_BODYWEIGHT_CHANGE = 7700  # NASA-referenced approximation, flagged as an assumption
RATION_SAFETY_FLOOR_PCT = 70
EXPIRY_WARNING_DAYS = 30


def bmr(sex: str, weight_kg: float, height_cm: float, age: int) -> float:
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == "M" else base - 161


def daily_need(crew: CrewMember) -> float:
    return bmr(crew.sex, crew.weight_kg, crew.height_cm, crew.age) * crew.activity_factor


def crew_daily_need(session: Session) -> float:
    crew = session.exec(select(CrewMember)).all()
    return sum(daily_need(c) for c in crew)


@dataclass
class StockTotals:
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    min_expiry_days: int | None


def _latest_snapshot(session: Session) -> InventorySnapshot | None:
    return session.exec(
        select(InventorySnapshot).order_by(InventorySnapshot.ts.desc())
    ).first()


def is_meal(event: ConsumptionEvent) -> bool:
    """A crew meal consumes whole catalogue packages, never virtual demo units.
    An event without a crew member comes from a shelf scan and is
    counted in boxes, i.e. whole lots at the demo scale."""
    return event.crew_member_id is not None


def pending_portions(session: Session, snapshot: InventorySnapshot) -> dict[int, int]:
    """Whole packages eaten per food since the given snapshot (legacy name)."""
    # A partial shelf photograph must not erase meals from untouched slots.
    carried = json.loads(snapshot.raw_json or "{}").get("carried_meals", {})
    eaten: dict[int, int] = {int(food): qty for food, qty in carried.items()}
    cancelled = {c.consumption_event_id for c in session.exec(select(MealCancellation)).all() if c.restore_stock}
    for event in session.exec(select(ConsumptionEvent).where(ConsumptionEvent.ts > snapshot.ts)):
        if is_meal(event) and event.id not in cancelled:
            eaten[event.food_item_id] = eaten.get(event.food_item_id, 0) - event.qty
    return eaten


def remaining_slot_counts(session: Session, snapshot: InventorySnapshot) -> dict[int, int]:
    """Allocate each consumed package once, in stable shelf order across duplicate foods."""
    lines = session.exec(select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)).all()
    lines_by_slot = {line.slot_id: line for line in lines}
    eaten = pending_portions(session, snapshot)
    remaining = {}
    for slot in session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all():
        line = lines_by_slot.get(slot.id)
        if line is None or line.source == "configuration_changed" or slot.food_item_id is None:
            continue
        used = min(line.count, eaten.get(slot.food_item_id, 0))
        remaining[slot.id] = max(0, line.count - used)
        eaten[slot.food_item_id] = max(0, eaten.get(slot.food_item_id, 0) - used)
    return remaining


def counted_foods(session: Session, snapshot: InventorySnapshot) -> dict[int, tuple[FoodItem, int]]:
    """Aggregate the remaining physical packages, after meals, once per product."""
    remaining = remaining_slot_counts(session, snapshot)
    foods: dict[int, tuple[FoodItem, int]] = {}
    for slot in session.exec(select(ShelfSlot)).all():
        if slot.id not in remaining:
            continue
        food = session.get(FoodItem, slot.food_item_id)
        if food is not None:
            previous = foods.get(food.id)
            foods[food.id] = (food, remaining[slot.id] + (previous[1] if previous else 0))
    return foods


def counted_package_kcal(session: Session) -> float:
    """Energy of remaining physical packages, without demo scaling."""
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return 0.0
    return sum(food.kcal * count for food, count in counted_foods(session, snapshot).values())


def current_stock(session: Session) -> StockTotals:
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return StockTotals(0, 0, 0, 0, None)
    kcal = protein = carbs = fat = 0.0
    min_expiry: int | None = None
    for food_id, (food, count) in counted_foods(session, snapshot).items():
        portions = count * food.units_per_lot
        if portions <= 0:
            continue
        kcal += portions * food.kcal
        protein += portions * food.protein_g
        carbs += portions * food.carbs_g
        fat += portions * food.fat_g
        if min_expiry is None or food.expiry_days < min_expiry:
            min_expiry = food.expiry_days
    return StockTotals(kcal, protein, carbs, fat, min_expiry)


@dataclass
class AutonomyReport:
    daily_need_kcal: float
    stock: StockTotals
    autonomy_days: float
    expiry_warning: bool


def autonomy_report(session: Session) -> AutonomyReport:
    need = crew_daily_need(session)
    stock = current_stock(session)
    days = stock.kcal / need if need > 0 else 0.0
    expiry_warning = stock.min_expiry_days is not None and stock.min_expiry_days < EXPIRY_WARNING_DAYS
    return AutonomyReport(need, stock, days, expiry_warning)


@dataclass
class AvailableItem:
    food_item_id: int
    name: str
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    available_count: int      # real packages remaining after logged meals
    available_portions: int   # same real units; retained for API compatibility


def available_items(session: Session) -> list[AvailableItem]:
    """Per-portion nutrition for whatever the latest scan still shows in
    stock — used for individual meal proposals, as opposed to the whole-crew
    autonomy numbers above."""
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return []
    out = []
    for food_id, (food, count) in counted_foods(session, snapshot).items():
        portions = count
        if portions <= 0:
            continue
        out.append(AvailableItem(food_item_id=food_id, name=food.name,
                                 kcal=food.kcal, protein_g=food.protein_g,
                                 carbs_g=food.carbs_g, fat_g=food.fat_g,
                                 available_count=count, available_portions=portions))
    return out


def consumed_today(session: Session, crew_member_id: int, since) -> list[dict]:
    cancelled = {c.consumption_event_id: c for c in session.exec(select(MealCancellation)).all()}
    events = session.exec(select(ConsumptionEvent).where(
        ConsumptionEvent.crew_member_id == crew_member_id,
        ConsumptionEvent.ts >= since,
        ConsumptionEvent.qty < 0,
    ).order_by(ConsumptionEvent.id.desc())).all()
    out = []
    for event in events:
        food = session.get(FoodItem, event.food_item_id)
        if food is not None:
            cancellation = cancelled.get(event.id)
            out.append({"id": event.id, "food_item_id": food.id, "name": food.name,
                        "qty": -event.qty, "kcal": -event.qty * food.kcal, "ts": event.ts,
                        "cancelled": cancellation is not None,
                        "cancelled_ts": cancellation.ts if cancellation else None})
    return out


def kcal_eaten_today(session: Session, crew_member_id: int, since) -> float:
    return sum(item["kcal"] for item in consumed_today(session, crew_member_id, since) if not item["cancelled"])


@dataclass
class RationingPlan:
    target_days: int
    ration_pct: float
    below_safety_floor: bool
    daily_kcal_per_crew: dict[int, float]
    projected_weight_change_kg_per_crew: dict[int, float]


def rationing_plan(session: Session, target_days: int) -> RationingPlan:
    stock = current_stock(session)
    crew = session.exec(select(CrewMember)).all()
    needs = {c.id: daily_need(c) for c in crew}
    total_need_over_period = sum(needs.values()) * target_days
    ration_pct = (
        min(100.0, stock.kcal / total_need_over_period * 100) if total_need_over_period > 0 else 0.0
    )

    daily_kcal_per_crew = {cid: need * (ration_pct / 100) for cid, need in needs.items()}
    weight_change = {
        cid: (daily_kcal_per_crew[cid] - need) * target_days / KCAL_PER_KG_BODYWEIGHT_CHANGE
        for cid, need in needs.items()
    }

    return RationingPlan(
        target_days=target_days,
        ration_pct=ration_pct,
        below_safety_floor=ration_pct < RATION_SAFETY_FLOOR_PCT,
        daily_kcal_per_crew=daily_kcal_per_crew,
        projected_weight_change_kg_per_crew=weight_change,
    )
