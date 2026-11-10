from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.models import ConsumptionEvent, FoodItem, InventoryLine, InventorySnapshot, ShelfSlot

router = APIRouter(prefix="/api/pantry", tags=["pantry"])


@router.get("")
def get_pantry() -> dict:
    with Session(engine) as session:
        snapshot = session.exec(
            select(InventorySnapshot).order_by(InventorySnapshot.ts.desc())
        ).first()
        slots = session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()
        lines_by_slot = {}
        if snapshot is not None:
            lines = session.exec(
                select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)
            ).all()
            lines_by_slot = {line.slot_id: line for line in lines}

        out = []
        for slot in slots:
            food = session.get(FoodItem, slot.food_item_id) if slot.food_item_id else None
            line = lines_by_slot.get(slot.id)
            out.append({
                "slot": slot.label,
                "item": food.name if food else None,
                "capacity": slot.capacity,
                "count": line.count if line else None,
                "confidence": line.confidence if line else None,
                "source": line.source if line else None,
            })
        return {
            "snapshot_ts": snapshot.ts if snapshot else None,
            "slots": out,
            "note": "autonomy/rations need the nutrition engine (phase 2) — not computed yet",
        }


@router.post("/scan")
def scan_pantry(mode: str = "mock") -> dict:
    raise HTTPException(501, "vision scan pipeline is phase 2 — not implemented yet")


class ConfirmBody(BaseModel):
    slot: str
    count: int


@router.post("/confirm")
def confirm_count(body: ConfirmBody) -> dict:
    raise HTTPException(501, "manual confirmation needs a live scan session (phase 2) — not implemented yet")


@router.get("/grid")
def get_grid() -> list[ShelfSlot]:
    with Session(engine) as session:
        return session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()


class GridUpdateBody(BaseModel):
    label: str
    capacity: int | None = None
    food_item_id: int | None = None


@router.put("/grid")
def update_grid(body: GridUpdateBody) -> ShelfSlot:
    with Session(engine) as session:
        slot = session.exec(select(ShelfSlot).where(ShelfSlot.label == body.label)).first()
        if slot is None:
            raise HTTPException(404, f"no slot '{body.label}'")
        if body.capacity is not None:
            slot.capacity = body.capacity
        if body.food_item_id is not None:
            slot.food_item_id = body.food_item_id
        session.add(slot)
        session.commit()
        session.refresh(slot)
        return slot


@router.get("/consumption")
def get_consumption() -> list[ConsumptionEvent]:
    with Session(engine) as session:
        return session.exec(
            select(ConsumptionEvent).order_by(ConsumptionEvent.ts.desc())
        ).all()

