from dataclasses import dataclass

from sqlmodel import Session, select

from app.models import CrewMember, FoodItem, InventoryLine, InventorySnapshot, ShelfSlot

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


def current_stock(session: Session) -> StockTotals:
    snapshot = _latest_snapshot(session)
    if snapshot is None:
        return StockTotals(0, 0, 0, 0, None)

    lines = session.exec(
        select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)
    ).all()
    slots = {s.id: s for s in session.exec(select(ShelfSlot)).all()}

    kcal = protein = carbs = fat = 0.0
    min_expiry: int | None = None
    for line in lines:
        slot = slots.get(line.slot_id)
        if slot is None or slot.food_item_id is None or line.count <= 0:
            continue
        food = session.get(FoodItem, slot.food_item_id)
        lot_count = line.count * food.units_per_lot
        kcal += lot_count * food.kcal
        protein += lot_count * food.protein_g
        carbs += lot_count * food.carbs_g
        fat += lot_count * food.fat_g
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
