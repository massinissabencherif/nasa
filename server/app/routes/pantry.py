import json
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.db import engine
from app.engines.nutrition import autonomy_report, crew_daily_need
from app.models import (
    ConsumptionEvent,
    CrewMember,
    FoodItem,
    InventoryLine,
    InventorySnapshot,
    ShelfSlot,
)
from app.routes.events import publish_event
from vision import grid as vision_grid
from vision.ollama_client import OllamaUnavailable
from vision.pipeline import LOW_CONFIDENCE_THRESHOLD, run_scan

router = APIRouter(prefix="/api/pantry", tags=["pantry"])

SERVER_DIR = Path(__file__).resolve().parent.parent.parent
FIXTURES_DIR = SERVER_DIR / "vision" / "fixtures"
DEFAULT_FIXTURE = FIXTURES_DIR / "shelf_full.png"
CAPTURES_DIR = SERVER_DIR / "captures"  # git-ignored; webcam frames of live scans
MEAL_ATTRIBUTION_WINDOW = timedelta(minutes=10)

_scan_lock = threading.Lock()  # one scan at a time: the VLM is the bottleneck


def _latest_snapshot(session: Session) -> InventorySnapshot | None:
    return session.exec(
        select(InventorySnapshot).order_by(InventorySnapshot.ts.desc(), InventorySnapshot.id.desc())
    ).first()


def _needs_confirmation(line: InventoryLine, slot: ShelfSlot) -> bool:
    if line.source == "manual":
        return False
    unexpected = slot.food_item_id is None and line.count > 0
    return line.confidence < LOW_CONFIDENCE_THRESHOLD or line.count > slot.capacity or unexpected


@router.get("")
def get_pantry() -> dict:
    with Session(engine) as session:
        snapshot = _latest_snapshot(session)
        slots = session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()
        lines_by_slot = {}
        pending_meals = 0
        if snapshot is not None:
            lines = session.exec(
                select(InventoryLine).where(InventoryLine.snapshot_id == snapshot.id)
            ).all()
            lines_by_slot = {line.slot_id: line for line in lines}
            pending_meals = len(
                session.exec(
                    select(ConsumptionEvent).where(ConsumptionEvent.ts > snapshot.ts)
                ).all()
            )

        need = crew_daily_need(session)
        units_per_lot = 1.0
        out = []
        for slot in slots:
            food = session.get(FoodItem, slot.food_item_id) if slot.food_item_id else None
            line = lines_by_slot.get(slot.id)
            slot_days = 0.0
            if food is not None:
                units_per_lot = food.units_per_lot
                if line is not None and need > 0:
                    slot_days = line.count * food.units_per_lot * food.kcal / need
            out.append({
                "slot": slot.label,
                "item": food.name if food else None,
                "food_item_id": slot.food_item_id,
                "capacity": slot.capacity,
                "count": line.count if line else None,
                "confidence": line.confidence if line else None,
                "source": line.source if line else None,
                "needs_confirmation": bool(line and _needs_confirmation(line, slot)),
                "autonomy_days": round(slot_days, 1),
            })
        report = autonomy_report(session)
        stock = report.stock

        def macro_days(stock_g: float, kcal_per_g: int, share: float) -> float:
            # days until this macro runs out at a standard energy split of the crew's need
            return round(stock_g * kcal_per_g / (need * share), 1) if need > 0 else 0.0

        return {
            "snapshot_ts": snapshot.ts if snapshot else None,
            "slots": out,
            "autonomy_days": round(report.autonomy_days, 1),
            "daily_need_kcal": round(report.daily_need_kcal, 1),
            "stock_kcal": round(stock.kcal, 1),
            "expiry_warning": report.expiry_warning,
            "min_expiry_days": stock.min_expiry_days,
            "units_per_lot": units_per_lot,
            "macro_autonomy_days": {
                "protein": macro_days(stock.protein_g, 4, 0.15),
                "carbs": macro_days(stock.carbs_g, 4, 0.55),
                "fat": macro_days(stock.fat_g, 9, 0.30),
            },
            "pending_meals": pending_meals,
            "assumption": f"Demo scale: 1 box on the shelf = 1 storage lot of {units_per_lot:g} rations. "
                          "Per-unit kcal are plausible simulated values, not lab-measured.",
        }


def _slot_expectations() -> tuple[dict[str, dict | None], dict[str, int]]:
    """What the vision model is told to expect in each slot, from the database
    (so a shelf re-assigned on the calibration screen is read correctly)."""
    with open(SERVER_DIR / "data" / "food_catalogue.json") as f:
        stacked = {i["name"] for i in json.load(f)["items"] if i.get("stacked")}
    with Session(engine) as session:
        slots = session.exec(select(ShelfSlot)).all()
        items: dict[str, dict | None] = {}
        for slot in slots:
            food = session.get(FoodItem, slot.food_item_id) if slot.food_item_id else None
            items[slot.label] = {"name": food.name, "stacked": food.name in stacked} if food else None
        return items, {slot.label: slot.capacity for slot in slots}


def _resolve_image_path(image_path: str) -> Path:
    """Only images inside the server folder may be scanned through the API
    (fixtures and saved captures) — the endpoint is open on the LAN."""
    path = Path(image_path)
    if not path.is_absolute():
        path = SERVER_DIR / path
    path = path.resolve()
    if SERVER_DIR.resolve() not in path.parents:
        raise HTTPException(400, "image_path must point inside the server folder (e.g. vision/fixtures/…)")
    return path


@router.post("/scan")
def scan_pantry(
    mode: str = "mock",
    image_path: str | None = None,
    camera_index: int = 0,
    variant: str = "full",
    strategy: str | None = None,
) -> dict:
    resolved = _resolve_image_path(image_path) if image_path else None

    if not _scan_lock.acquire(blocking=False):
        raise HTTPException(409, "a scan is already running — wait for it to finish")
    try:
        publish_event({"type": "scan_started", "mode": mode})

        def on_progress(done_labels: list[str]) -> None:
            publish_event({"type": "scan_progress", "labels": done_labels})

        try:
            slot_items, capacities = _slot_expectations()
            result = run_scan(
                mode=mode, image_path=str(resolved) if resolved else None,
                camera_index=camera_index, variant=variant, strategy=strategy,
                on_progress=on_progress, slot_items=slot_items, capacities=capacities,
            )
        except OllamaUnavailable as exc:
            publish_event({"type": "scan_failed", "detail": str(exc)})
            raise HTTPException(503, str(exc)) from exc
        except (FileNotFoundError, RuntimeError, ValueError) as exc:
            publish_event({"type": "scan_failed", "detail": str(exc)})
            raise HTTPException(400, str(exc)) from exc

        snapshot_ts = datetime.now(timezone.utc)
        if result.frame is not None:  # live camera: keep the frame so the overlay matches reality
            CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
            capture_path = CAPTURES_DIR / f"scan-{snapshot_ts:%Y%m%d-%H%M%S}.jpg"
            cv2.imwrite(str(capture_path), result.frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            stored_image_path = str(capture_path.relative_to(SERVER_DIR))
        else:
            stored_image_path = str(Path(result.image_path).relative_to(SERVER_DIR))

        with Session(engine) as session:
            slots = session.exec(select(ShelfSlot)).all()
            prev_snapshot = _latest_snapshot(session)
            prev_lines = {}
            if prev_snapshot is not None:
                prev_lines = {
                    line.slot_id: line
                    for line in session.exec(
                        select(InventoryLine).where(InventoryLine.snapshot_id == prev_snapshot.id)
                    ).all()
                }

            snapshot = InventorySnapshot(
                ts=snapshot_ts,
                image_path=stored_image_path,
                raw_json=json.dumps(result.raw_json),
            )
            session.add(snapshot)
            session.flush()

            out = []
            source = "simulated" if mode == "mock" else "camera"
            for slot in slots:
                reading = result.readings.get(slot.label)
                if reading is None:
                    continue
                line = InventoryLine(
                    snapshot_id=snapshot.id, slot_id=slot.id, count=reading.count,
                    confidence=reading.confidence, source=source,
                )
                session.add(line)
                prev_count = prev_lines[slot.id].count if slot.id in prev_lines else None
                if slot.food_item_id is not None and prev_count is not None:
                    _record_delta(session, slot.food_item_id, reading.count - prev_count, snapshot_ts)
                out.append({
                    "slot": slot.label,
                    "count": reading.count,
                    "confidence": reading.confidence,
                    "needs_confirmation": _needs_confirmation(line, slot),
                    "note": reading.note,
                })
            session.commit()
            autonomy = round(autonomy_report(session).autonomy_days, 1)

        publish_event({
            "type": "scan_complete", "snapshot_ts": snapshot_ts.isoformat(),
            "autonomy_days": autonomy, "slots": out,
        })
        return {
            "snapshot_ts": snapshot_ts,
            "mode": mode,
            "strategy": result.strategy,
            "elapsed_s": round(result.elapsed_s, 1),
            "autonomy_days": autonomy,
            "slots": out,
        }
    finally:
        _scan_lock.release()


def _record_delta(session: Session, food_item_id: int, delta: int, snapshot_ts: datetime) -> None:
    """Turn a count change between two scans into a consumption (negative) or
    restock (positive) event. Units a crew member already logged as a meal in
    the last 10 minutes are attributed to them, not counted a second time."""
    if delta == 0:
        return
    if delta > 0:
        session.add(ConsumptionEvent(ts=snapshot_ts, food_item_id=food_item_id, qty=delta))
        return
    recent_meal_qty = sum(
        e.qty
        for e in session.exec(
            select(ConsumptionEvent).where(
                ConsumptionEvent.food_item_id == food_item_id,
                ConsumptionEvent.crew_member_id.is_not(None),
                ConsumptionEvent.ts >= snapshot_ts - MEAL_ATTRIBUTION_WINDOW,
                ConsumptionEvent.ts < snapshot_ts,
            )
        )
    )
    remainder = delta - recent_meal_qty
    if remainder < 0:
        session.add(ConsumptionEvent(ts=snapshot_ts, food_item_id=food_item_id, qty=remainder))


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
UPLOAD_MAX_WIDTH = 1600


@router.post("/photo")
def scan_photo(
    file: UploadFile = File(...),
    scan: bool = True,
    strategy: str | None = None,
) -> dict:
    """Use any camera as the shelf camera: a phone (or a file picker on the
    station) uploads a photo. With scan=true it is read by the vision model
    like a webcam frame; with scan=false it only becomes the reference image
    for calibrating the slot grid, and the counts are left untouched."""
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "photo is larger than 20 MB")
    img = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "could not read this file as an image (use JPEG or PNG)")
    h, w = img.shape[:2]
    if w > UPLOAD_MAX_WIDTH:
        img = cv2.resize(img, (UPLOAD_MAX_WIDTH, int(h * UPLOAD_MAX_WIDTH / w)), interpolation=cv2.INTER_AREA)
    CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    path = CAPTURES_DIR / f"photo-{now:%Y%m%d-%H%M%S}.jpg"
    cv2.imwrite(str(path), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    relative = str(path.relative_to(SERVER_DIR))

    if scan:
        return scan_pantry(mode="image", image_path=relative, strategy=strategy)

    with Session(engine) as session:
        previous = _latest_snapshot(session)
        snapshot = InventorySnapshot(ts=now, image_path=relative, raw_json=json.dumps({"reference_only": True}))
        session.add(snapshot)
        session.flush()
        if previous is not None:  # carry the counts over: only the picture changes
            for line in session.exec(
                select(InventoryLine).where(InventoryLine.snapshot_id == previous.id)
            ).all():
                session.add(InventoryLine(
                    snapshot_id=snapshot.id, slot_id=line.slot_id, count=line.count,
                    confidence=line.confidence, source=line.source,
                ))
        session.commit()
    publish_event({"type": "reference_photo", "snapshot_ts": now.isoformat()})
    return {"snapshot_ts": now, "mode": "reference", "image_path": relative}


class GridFrameBody(BaseModel):
    """Outer frame of the shelf in the picture, normalised 0-1."""
    left: float = Field(ge=0, le=1)
    top: float = Field(ge=0, le=1)
    right: float = Field(ge=0, le=1)
    bottom: float = Field(ge=0, le=1)


@router.put("/grid-frame")
def set_grid_from_frame(body: GridFrameBody) -> dict[str, list[float]]:
    """Fast calibration for a real shelf: give the outer frame, get 3 x 4 equal slots."""
    if body.right - body.left < 0.2 or body.bottom - body.top < 0.2:
        raise HTTPException(400, "frame is too small or inverted")
    col_w = (body.right - body.left) / 4
    row_h = (body.bottom - body.top) / 3
    boxes = {}
    for r, row in enumerate("ABC"):
        for c in range(4):
            boxes[f"{row}{c + 1}"] = (
                round(body.left + c * col_w, 4), round(body.top + r * row_h, 4),
                round(body.left + (c + 1) * col_w, 4), round(body.top + (r + 1) * row_h, 4),
            )
    vision_grid.save_boxes(boxes)
    publish_event({"type": "grid_changed"})
    return vision_grid.load_boxes()


class ConfirmBody(BaseModel):
    slot: str
    count: int = Field(ge=0, le=99)


@router.post("/confirm")
def confirm_count(body: ConfirmBody) -> dict:
    with Session(engine) as session:
        slot = session.exec(select(ShelfSlot).where(ShelfSlot.label == body.slot)).first()
        if slot is None:
            raise HTTPException(404, f"no slot '{body.slot}'")
        snapshot = _latest_snapshot(session)
        if snapshot is None:
            raise HTTPException(404, "no scan to confirm — run /api/pantry/scan first")
        line = session.exec(
            select(InventoryLine).where(
                InventoryLine.snapshot_id == snapshot.id, InventoryLine.slot_id == slot.id
            )
        ).first()
        if line is None:
            raise HTTPException(404, f"no inventory line for slot '{body.slot}' in the latest scan")

        correction = body.count - line.count
        line.count = body.count
        line.confidence = 1.0
        line.source = "manual"
        session.add(line)

        # Keep the consumption feed consistent with the corrected count: fold the
        # correction into the anonymous event this scan produced for that item.
        if correction != 0 and slot.food_item_id is not None:
            event = session.exec(
                select(ConsumptionEvent).where(
                    ConsumptionEvent.food_item_id == slot.food_item_id,
                    ConsumptionEvent.crew_member_id.is_(None),
                    ConsumptionEvent.ts == snapshot.ts,
                )
            ).first()
            if event is None:
                session.add(
                    ConsumptionEvent(ts=snapshot.ts, food_item_id=slot.food_item_id, qty=correction)
                )
            elif event.qty + correction == 0:
                session.delete(event)
            else:
                event.qty += correction
                session.add(event)
        session.commit()
        autonomy = round(autonomy_report(session).autonomy_days, 1)
    publish_event({"type": "slot_confirmed", "slot": body.slot, "count": body.count, "autonomy_days": autonomy})
    return {"slot": body.slot, "count": body.count, "source": "manual", "autonomy_days": autonomy}


@router.get("/grid")
def get_grid() -> list[ShelfSlot]:
    with Session(engine) as session:
        return session.exec(select(ShelfSlot).order_by(ShelfSlot.label)).all()


class GridUpdateBody(BaseModel):
    label: str
    capacity: int | None = Field(default=None, ge=1, le=99)
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
            # 0 clears the slot (expected empty)
            if body.food_item_id != 0 and session.get(FoodItem, body.food_item_id) is None:
                raise HTTPException(404, f"no food item {body.food_item_id}")
            slot.food_item_id = body.food_item_id or None
        session.add(slot)
        session.commit()
        session.refresh(slot)
        return slot


class FoodItemBody(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    kcal: float = Field(ge=0, le=20000)
    protein_g: float = Field(default=0, ge=0, le=2000)
    carbs_g: float = Field(default=0, ge=0, le=5000)
    fat_g: float = Field(default=0, ge=0, le=2000)


@router.get("/items")
def list_items() -> list[FoodItem]:
    with Session(engine) as session:
        return session.exec(select(FoodItem).order_by(FoodItem.name)).all()


@router.post("/items")
def add_item(body: FoodItemBody) -> FoodItem:
    """Add a product of the real shelf to the catalogue (per-unit values typed
    from its label). It gets the same demo scale as the seeded items."""
    with Session(engine) as session:
        template = session.exec(select(FoodItem)).first()
        item = FoodItem(
            name=body.name.strip(), kcal=body.kcal, protein_g=body.protein_g, carbs_g=body.carbs_g,
            fat_g=body.fat_g, mass_g=0, expiry_days=365,
            units_per_lot=template.units_per_lot if template else 1.0, note="added on the station",
        )
        session.add(item)
        session.commit()
        session.refresh(item)
        return item


@router.get("/consumption")
def get_consumption(limit: int = 30) -> list[dict]:
    with Session(engine) as session:
        events = session.exec(
            select(ConsumptionEvent).order_by(ConsumptionEvent.ts.desc(), ConsumptionEvent.id.desc()).limit(limit)
        ).all()
        foods = {f.id: f.name for f in session.exec(select(FoodItem)).all()}
        crew = {c.id: c.name for c in session.exec(select(CrewMember)).all()}
        return [
            {
                "id": e.id, "ts": e.ts, "food_item_id": e.food_item_id, "qty": e.qty,
                "crew_member_id": e.crew_member_id,
                "food_name": foods.get(e.food_item_id),
                "crew_name": crew.get(e.crew_member_id) if e.crew_member_id else None,
            }
            for e in events
        ]


@router.get("/snapshot-image")
def get_snapshot_image() -> FileResponse:
    with Session(engine) as session:
        snapshot = _latest_snapshot(session)
    path = DEFAULT_FIXTURE
    if snapshot and snapshot.image_path:
        candidate = (SERVER_DIR / snapshot.image_path).resolve()
        if candidate.is_file() and SERVER_DIR.resolve() in candidate.parents:
            path = candidate
    media_type = "image/jpeg" if path.suffix.lower() in (".jpg", ".jpeg") else "image/png"
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-store"})


@router.get("/grid-boxes")
def get_grid_boxes() -> dict[str, list[float]]:
    return vision_grid.load_boxes()


class GridBoxUpdateBody(BaseModel):
    label: str
    box: list[float]


@router.put("/grid-boxes")
def update_grid_boxes(body: GridBoxUpdateBody) -> dict[str, list[float]]:
    if len(body.box) != 4 or not all(0 <= v <= 1 for v in body.box):
        raise HTTPException(400, "box must be [x0, y0, x1, y1] with normalised 0-1 values")
    x0, y0, x1, y1 = body.box
    if x1 - x0 < 0.02 or y1 - y0 < 0.02:
        raise HTTPException(400, "box is too small or inverted (x1 must be > x0, y1 > y0)")
    boxes = vision_grid.load_boxes()
    if body.label not in boxes:
        raise HTTPException(404, f"no slot '{body.label}'")
    boxes[body.label] = tuple(body.box)
    vision_grid.save_boxes(boxes)
    return vision_grid.load_boxes()

