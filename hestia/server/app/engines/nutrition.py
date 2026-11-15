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
    """A consumption event logged by a crew member is a meal, counted in real
    portions. An event without a crew member comes from a shelf scan and is
    counted in boxes, i.e. whole lots at the demo scale."""
    return event.crew_member_id is not None


def pending_portions(session: Session, snapshot: InventorySnapshot) -> dict[int, int]:
    """Portions eaten per food item since the given snapshot."""
    # A partial shelf photograph must not erase meals from untouched slots.
    carried = json.loads(snapshot.raw_json or "{}").get("carried_meals", {})
    eaten: dict[int, int] = {int(food): qty for food, qty in carried.items()}
    for event in session.exec(select(ConsumptionEvent).where(ConsumptionEvent.ts > snapshot.ts)):
        if is_meal(event):
            eaten[event.food_item_id] = eaten.get(event.food_item_id, 0) - event.qty
    return eaten


def counted_foods(session: Session, snapshot: InventorySnapshot) -> dict[int, tuple[FoodItem, int]]:
    """Aggregate distinct shelf locations before subtracting meals once per product."""
    lines = session.exec(select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)).all()
    slots = {slot.id: slot for slot in session.exec(select(ShelfSlot)).all()}
    foods: dict[int, tuple[FoodItem, int]] = {}
    for line in lines:
        slot = slots.get(line.slot_id)
        if line.source == "configuration_changed" or slot is None or slot.food_item_id is None:
            continue
        food = session.get(FoodItem, slot.food_item_id)
        if food is not None:
            previous = foods.get(food.id)
            foods[food.id] = (food, line.count + (previous[1] if previous else 0))
    return foods


def counted_package_kcal(session: Session) -> float:
    """Energy of the recorded packages, without demo scaling or later meal deductions."""
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return 0.0
    return sum(food.kcal * count for food, count in counted_foods(session, snapshot).values())


def current_stock(session: Session) -> StockTotals:
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return StockTotals(0, 0, 0, 0, None)
    portions_eaten = pending_portions(session, snapshot)
    kcal = protein = carbs = fat = 0.0
    min_expiry: int | None = None
    for food_id, (food, count) in counted_foods(session, snapshot).items():
        portions = count * food.units_per_lot - portions_eaten.get(food_id, 0)
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
    available_count: int      # boxes seen on the shelf by the last scan
    available_portions: int   # portions left in those boxes (demo scale)


def available_items(session: Session) -> list[AvailableItem]:
    """Per-portion nutrition for whatever the latest scan still shows in
    stock — used for individual meal proposals, as opposed to the whole-crew
    autonomy numbers above."""
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return []
    portions_eaten = pending_portions(session, snapshot)
    out = []
    for food_id, (food, count) in counted_foods(session, snapshot).items():
        portions = count * food.units_per_lot - portions_eaten.get(food_id, 0)
        if portions <= 0:
            continue
        out.append(AvailableItem(food_item_id=food_id, name=food.name,
                                 kcal=food.kcal, protein_g=food.protein_g,
                                 carbs_g=food.carbs_g, fat_g=food.fat_g,
                                 available_count=count, available_portions=portions))
    return out


def kcal_eaten_today(session: Session, crew_member_id: int, since) -> float:
    events = session.exec(
        select(ConsumptionEvent).where(
            ConsumptionEvent.crew_member_id == crew_member_id,
            ConsumptionEvent.ts >= since,
            ConsumptionEvent.qty < 0,
        )
    ).all()
    total = 0.0
    for event in events:
        food = session.get(FoodItem, event.food_item_id)
        if food:
            total += -event.qty * food.kcal
    return total


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
