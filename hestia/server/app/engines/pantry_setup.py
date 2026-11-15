"""Explicit inventory setup; never reset crew or catalogue data."""
import json
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.models import InventoryLine, InventorySnapshot, ShelfSlot, FoodItem


def empty_stock(session: Session) -> InventorySnapshot:
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    snapshot = InventorySnapshot(ts=datetime.now(timezone.utc), image_path="",
                                 raw_json=json.dumps({"stock_emptied": True, "boxes": {}}))
    session.add(snapshot)
    session.flush()
    for slot in session.exec(select(ShelfSlot)):
        session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id,
                                  count=0, confidence=1, source="manual"))
    session.commit()
    return snapshot


def update_product(session: Session, food_id: int, values: dict) -> FoodItem:
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    food = session.get(FoodItem, food_id)
    if food is None:
        raise ValueError("Product not found.")
    for key in ("name", "kcal", "protein_g", "carbs_g", "fat_g"):
        setattr(food, key, values[key])
    food.name = food.name.strip()
    food.note = "values entered on the station"
    session.add(food)
    session.commit()
    session.refresh(food)
    return food


def set_scale(session: Session, multiplier: int) -> None:
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    for food in session.exec(select(FoodItem)).all():
        food.units_per_lot = multiplier
        session.add(food)
    session.commit()
