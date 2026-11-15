"""Bounded, short-lived scan proposals. Only explicit review writes inventory."""
import hashlib
import json
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from app.models import ConsumptionEvent, InventoryLine, InventorySnapshot, ShelfSlot, FoodItem, MealCancellation
from app.engines.nutrition import remaining_slot_counts


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
    state.append([(c.consumption_event_id, c.restore_stock) for c in
                  session.exec(select(MealCancellation).order_by(MealCancellation.consumption_event_id)).all()])
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


def apply(session: Session, proposal: Proposal, counts: dict[str, int], *, replace_stock: bool = False,
          add_stock: bool = False) -> InventorySnapshot:
    # SQLite write lock covers revision validation and all inventory writes together.
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    if add_stock and replace_stock:
        raise ValueError("Choose either adding products or replacing stock, not both.")
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
    remaining = remaining_slot_counts(session, previous) if previous else {}
    if add_stock and previous:
        unknown = [s.label for s in slots if s.label in counts and s.food_item_id is not None
                   and s.id not in remaining]
        if unknown:
            raise ValueError("Current quantity is unknown for " + ", ".join(unknown)
                             + ". Recount these slots or replace the whole stock first.")
    now = datetime.now(timezone.utc)
    snapshot = InventorySnapshot(ts=now, image_path=proposal.image_path, raw_json=json.dumps({
        **proposal.raw, "boxes": proposal.boxes, "human_reviewed": True,
        "replaces_stock": replace_stock,
        "adds_stock": add_stock,
        "photo_counts": counts,
        "carried_meals": {},  # already deducted into the new physical counts
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
                session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id,
                                          count=remaining.get(slot.id, old.count),
                                          confidence=old.confidence, source=old.source))
            continue
        before = remaining.get(slot.id, 0)
        # Capacity bounds one photographed batch; accumulated deliveries may
        # contain more packages than fit in a single photograph.
        count = before + counts[slot.label] if add_stock else counts[slot.label]
        if count > 99:
            raise ValueError(f"Total for {slot.label} exceeds the supported stock limit of 99 packages.")
        session.add(InventoryLine(snapshot_id=snapshot.id, slot_id=slot.id, count=count,
                                  confidence=1, source="manual" if add_stock or proposal.mode != "mock" else "simulated"))
        delta = count - before
        if delta and slot.food_item_id:
            session.add(ConsumptionEvent(ts=now, food_item_id=slot.food_item_id, qty=delta))
    session.commit()
    return snapshot
