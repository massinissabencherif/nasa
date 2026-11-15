"""Bounded, short-lived scan proposals. Only explicit review writes inventory."""
import hashlib
import json
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.models import ConsumptionEvent, InventoryLine, InventorySnapshot, ShelfSlot, FoodItem
from app.engines.nutrition import pending_portions


@dataclass
class Proposal:
    id: str
    created: float
    revision: str
    image_path: str
    boxes: dict
    readings: dict
    raw: dict
    mode: str


_pending: dict[str, Proposal] = {}
lock = threading.Lock()
LIFETIME_SECONDS = 1800


def revision(session: Session) -> str:
    snapshot = session.exec(select(InventorySnapshot).order_by(InventorySnapshot.id.desc())).first()
    lines = session.exec(select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)).all() if snapshot else []
    slots = session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()
    event = session.exec(select(ConsumptionEvent).order_by(ConsumptionEvent.id.desc())).first()
    foods = session.exec(select(FoodItem).order_by(FoodItem.id)).all()
    state = [snapshot.id if snapshot else None,
             sorted((x.slot_id, x.count, x.source) for x in lines),
             [(s.label, s.food_item_id, s.capacity) for s in slots],
             event.id if event else None,
             [(f.id, f.name, f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.units_per_lot) for f in foods]]
    return hashlib.sha256(json.dumps(state).encode()).hexdigest()


def stage(*, baseline: str, image_path: str, boxes: dict, result, mode: str) -> Proposal:
    with lock:
        now = time.time()
        for key in list(_pending):
            if now - _pending[key].created > LIFETIME_SECONDS:
                del _pending[key]
        if len(_pending) >= 20:
            del _pending[min(_pending, key=lambda key: _pending[key].created)]
        proposal = Proposal(uuid4().hex, now, baseline, image_path, boxes, result.readings, result.raw_json, mode)
        _pending[proposal.id] = proposal
        return proposal


def get(proposal_id: str) -> Proposal:
    proposal = _pending.get(proposal_id)
    if proposal is None or time.time() - proposal.created > LIFETIME_SECONDS:
        raise ValueError("This preview has expired or was already saved. Take a new photo.")
    return proposal


def discard(proposal_id: str) -> None:
    _pending.pop(proposal_id, None)


def apply(session: Session, proposal: Proposal, counts: dict[str, int], *, replace_stock: bool = False) -> InventorySnapshot:
    # SQLite write lock covers revision validation and all inventory writes together.
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    if revision(session) != proposal.revision:
        raise ValueError("Stock or its catalogue changed during this review. Take a new photo before saving.")
    slots = session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()
    if set(counts) != set(proposal.readings) or not set(counts) <= {s.label for s in slots}:
        raise ValueError("Review every slot before saving.")
    for slot in slots:
        if slot.label not in counts:
            continue
        count = counts[slot.label]
        if type(count) is not int or not 0 <= count <= slot.capacity:
            raise ValueError(f"Invalid count for {slot.label} (0–{slot.capacity}).")
        if slot.food_item_id is None and count:
            raise ValueError(f"Assign a food to {slot.label} before recording items there.")
    previous = session.exec(select(InventorySnapshot).order_by(InventorySnapshot.id.desc())).first()
    previous_lines = {line.slot_id: line for line in session.exec(
        select(InventoryLine).where(InventoryLine.snapshot_id == previous.id)
    )} if previous else {}
    now = datetime.now(timezone.utc)
    photographed_foods = {s.food_item_id for s in slots if s.label in counts}
    carried_meals = {str(food): qty for food, qty in pending_portions(session, previous).items()
                     if food not in photographed_foods} if previous and not replace_stock else {}
    snapshot = InventorySnapshot(ts=now, image_path=proposal.image_path, raw_json=json.dumps({
        **proposal.raw, "boxes": proposal.boxes, "human_reviewed": True,
        "replaces_stock": replace_stock,
        "carried_meals": carried_meals,
        "proposed_counts": {key: r.count for key, r in proposal.readings.items()},
    }))
    session.add(snapshot)
    session.flush()
    for slot in slots:
        old = previous_lines.get(slot.id)
        if slot.label not in counts:
            if replace_stock:
                session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id, count=0,
                                          confidence=1, source="manual"))
            elif old is not None:
                session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id, count=old.count,
                                          confidence=old.confidence, source=old.source))
            continue
        count = counts[slot.label]
        session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id, count=count,
                                  confidence=1, source="manual" if proposal.mode != "mock" else "simulated"))
        delta = count - (old.count if old else count)
        if delta and slot.food_item_id:
            session.add(ConsumptionEvent(ts=now, food_item_id=slot.food_item_id, qty=delta))
    session.commit()
    return snapshot
