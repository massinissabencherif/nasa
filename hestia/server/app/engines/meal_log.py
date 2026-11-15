"""Auditable, once-only cancellation of a person's recorded consumption."""
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models import ConsumptionEvent, CrewMember, InventorySnapshot, MealCancellation
from .gamification import unregister_meal
from .nutrition import counted_foods


def cancel_meal(session: Session, crew_id: int, event_id: int) -> dict:
    session.connection().exec_driver_sql("BEGIN IMMEDIATE")
    event = session.get(ConsumptionEvent, event_id)
    if (session.get(CrewMember, crew_id) is None or event is None
            or event.crew_member_id != crew_id or event.qty >= 0):
        raise LookupError("Consumption not found for this crew member.")
    cancellation = session.get(MealCancellation, event_id)
    already_cancelled = cancellation is not None
    if cancellation is None:
        snapshot = session.exec(select(InventorySnapshot).order_by(InventorySnapshot.id.desc())).first()
        before = counted_foods(session, snapshot).get(event.food_item_id) if snapshot else None
        # After a new count/reference, the saved physical stock is authoritative.
        # Do not add a package which that newer count may already include.
        restore = bool(snapshot and snapshot.ts <= event.ts and before is not None)
        cancellation = MealCancellation(consumption_event_id=event_id,
            ts=datetime.now(timezone.utc), restore_stock=restore)
        session.add(cancellation)
        session.flush()
        if restore:
            after = counted_foods(session, snapshot).get(event.food_item_id)
            cancellation.restored_qty = max(0, (after[1] if after else 0) - before[1])
        unregister_meal(session, crew_id)
        session.add(cancellation)
        session.commit()
        session.refresh(cancellation)
    return {"event_id": event_id, "cancelled": True, "already_cancelled": already_cancelled,
            "restored_qty": cancellation.restored_qty,
            "stock_needs_check": not cancellation.restore_stock or cancellation.restored_qty < -event.qty}
