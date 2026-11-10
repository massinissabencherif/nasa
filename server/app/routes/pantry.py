import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import engine
from app.engines.nutrition import autonomy_report
from app.models import ConsumptionEvent, FoodItem, InventoryLine, InventorySnapshot, ShelfSlot
from app.routes.events import publish_event
from vision import grid as vision_grid
from vision.pipeline import run_scan

router = APIRouter(prefix="/api/pantry", tags=["pantry"])

SERVER_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_FIXTURE = SERVER_DIR / "vision" / "fixtures" / "shelf_full.png"


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
                "food_item_id": slot.food_item_id,
                "capacity": slot.capacity,
                "count": line.count if line else None,
                "confidence": line.confidence if line else None,
                "source": line.source if line else None,
                "needs_confirmation": bool(
                    line and (line.confidence < 0.6 or line.count > slot.capacity)
                ),
            })
        report = autonomy_report(session)
        return {
            "snapshot_ts": snapshot.ts if snapshot else None,
            "slots": out,
            "autonomy_days": round(report.autonomy_days, 1),
            "daily_need_kcal": round(report.daily_need_kcal, 1),
            "stock_kcal": round(report.stock.kcal, 1),
            "expiry_warning": report.expiry_warning,
            "assumption": "kcal values are demo-scaled via food_item.units_per_lot "
                          "(see docs/prompt/PROMPT_ADDENDUM.md #1) — not real ration sizes.",
        }


@router.post("/scan")
def scan_pantry(mode: str = "mock", image_path: str | None = None, camera_index: int = 0) -> dict:
    def on_row_done(row_letter: str, entries: dict[str, dict]) -> None:
        publish_event({"type": "scan_row_done", "row": row_letter, "labels": list(entries.keys())})

    try:
        result = run_scan(
            mode=mode, image_path=image_path, camera_index=camera_index, on_row_done=on_row_done
        )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        raise HTTPException(400, str(exc)) from exc

    stored_image_path = image_path or (str(DEFAULT_FIXTURE) if mode == "mock" else None)

    with Session(engine) as session:
        slots = session.exec(select(ShelfSlot)).all()
        prev_snapshot = session.exec(
            select(InventorySnapshot).order_by(InventorySnapshot.ts.desc())
        ).first()
        prev_lines = {}
        if prev_snapshot is not None:
            prev_lines = {
                line.slot_id: line
                for line in session.exec(
                    select(InventoryLine).where(InventoryLine.snapshot_id == prev_snapshot.id)
                ).all()
            }

        snapshot_ts = datetime.now(timezone.utc)
        snapshot = InventorySnapshot(
            ts=snapshot_ts,
            image_path=stored_image_path,
            raw_json=json.dumps({k: v.model_dump() for k, v in result.readings.items()}),
        )
        session.add(snapshot)
        session.flush()

        out = []
        for slot in slots:
            reading = result.readings.get(slot.label)
            if reading is None:
                continue
            prev_count = prev_lines[slot.id].count if slot.id in prev_lines else None
            needs_confirmation = (
                slot.label in result.needs_confirmation or reading.count > slot.capacity
            )
            source = "simulated" if mode == "mock" else "camera"
            session.add(
                InventoryLine(
                    snapshot_id=snapshot.id,
                    slot_id=slot.id,
                    count=reading.count,
                    confidence=reading.confidence,
                    source=source,
                )
            )
            if slot.food_item_id is not None and prev_count is not None:
                delta = reading.count - prev_count
                if delta != 0:
                    session.add(
                        ConsumptionEvent(
                            ts=snapshot_ts, food_item_id=slot.food_item_id, qty=delta,
                        )
                    )
            out.append({
                "slot": slot.label,
                "count": reading.count,
                "confidence": reading.confidence,
                "needs_confirmation": needs_confirmation,
            })
        session.commit()

    publish_event({"type": "scan_complete", "snapshot_ts": snapshot_ts.isoformat(), "slots": out})
    return {
        "snapshot_ts": snapshot_ts,
        "strategy": result.strategy,
        "elapsed_s": round(result.elapsed_s, 1),
        "slots": out,
    }


class ConfirmBody(BaseModel):
    slot: str
    count: int


@router.post("/confirm")
def confirm_count(body: ConfirmBody) -> InventoryLine:
    with Session(engine) as session:
        slot = session.exec(select(ShelfSlot).where(ShelfSlot.label == body.slot)).first()
        if slot is None:
            raise HTTPException(404, f"no slot '{body.slot}'")
        snapshot = session.exec(
            select(InventorySnapshot).order_by(InventorySnapshot.ts.desc())
        ).first()
        if snapshot is None:
            raise HTTPException(404, "no scan to confirm — run /api/pantry/scan first")
        line = session.exec(
            select(InventoryLine).where(
                InventoryLine.snapshot_id == snapshot.id, InventoryLine.slot_id == slot.id
            )
        ).first()
        if line is None:
            raise HTTPException(404, f"no inventory line for slot '{body.slot}' in the latest scan")
        line.count = body.count
        line.confidence = 1.0
        line.source = "manual"
        session.add(line)
        session.commit()
        session.refresh(line)
        return line


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


@router.get("/snapshot-image")
def get_snapshot_image() -> FileResponse:
    with Session(engine) as session:
        snapshot = session.exec(
            select(InventorySnapshot).order_by(InventorySnapshot.ts.desc())
        ).first()
    path = Path(snapshot.image_path) if snapshot and snapshot.image_path else DEFAULT_FIXTURE
    if not path.is_absolute():
        path = SERVER_DIR / path
    if not path.is_file():
        path = DEFAULT_FIXTURE
    return FileResponse(path, media_type="image/png")


@router.get("/grid-boxes")
def get_grid_boxes() -> dict[str, list[float]]:
    return vision_grid.load_boxes()


class GridBoxUpdateBody(BaseModel):
    label: str
    box: list[float]


@router.put("/grid-boxes")
def update_grid_boxes(body: GridBoxUpdateBody) -> dict[str, list[float]]:
    if len(body.box) != 4:
        raise HTTPException(400, "box must be [x0, y0, x1, y1]")
    boxes = vision_grid.load_boxes()
    if body.label not in boxes:
        raise HTTPException(404, f"no slot '{body.label}'")
    boxes[body.label] = tuple(body.box)
    vision_grid.save_boxes(boxes)
    return vision_grid.load_boxes()

