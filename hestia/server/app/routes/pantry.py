import json
import threading
from uuid import uuid4
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, StrictInt, field_validator
from sqlmodel import Session, select

from app.db import engine
from app.engines.nutrition import autonomy_report, crew_daily_need, is_meal, counted_package_kcal, pending_portions
from app.engines import pantry_review, pantry_setup
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
            pending_meals = sum(
                1
                for event in session.exec(
                    select(ConsumptionEvent).where(ConsumptionEvent.ts > snapshot.ts)
                )
                if is_meal(event)
            )

        need = crew_daily_need(session)
        units_per_lot = 1.0
        out = []
        for slot in slots:
            food = session.get(FoodItem, slot.food_item_id) if slot.food_item_id else None
            line = lines_by_slot.get(slot.id)
            count = line.count if line and line.source != "configuration_changed" else None
            slot_days = 0.0
            if food is not None:
                units_per_lot = food.units_per_lot
                if count is not None and need > 0:
                    slot_days = count * food.units_per_lot * food.kcal / need
            out.append({
                "slot": slot.label,
                "item": food.name if food else None,
                "food_item_id": slot.food_item_id,
                "capacity": slot.capacity,
                "count": count,
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
            "has_photo": bool(snapshot and snapshot.image_path),
            "boxes": json.loads(snapshot.raw_json or "{}").get("boxes", vision_grid.load_boxes()) if snapshot else vision_grid.load_boxes(),
            "snapshot_ts": snapshot.ts if snapshot else None,
            "slots": out,
            "autonomy_days": round(report.autonomy_days, 1),
            "daily_need_kcal": round(report.daily_need_kcal, 1),
            "stock_kcal": round(stock.kcal, 1),
            "counted_package_kcal": round(counted_package_kcal(session), 1),
            "default_units_per_lot": json.loads((SERVER_DIR / "data" / "food_catalogue.json").read_text())["units_per_lot"],
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
    review: bool = False,
    boxes: dict | None = None,
) -> dict:
    resolved = _resolve_image_path(image_path) if image_path else None

    if not _scan_lock.acquire(blocking=False):
        raise HTTPException(409, "a scan is already running — wait for it to finish")
    try:
        with Session(engine) as session:
            baseline = pantry_review.revision(session)
        active_boxes = boxes or vision_grid.load_boxes()
        known_labels = {f"{row}{col}" for row in "ABC" for col in range(1, 5)}
        if not set(active_boxes) <= known_labels or any(
            not isinstance(b, (list, tuple)) or len(b) != 4
            or not all(type(n) in (int, float) and 0 <= n <= 1 for n in b)
            or b[2] - b[0] < .02 or b[3] - b[1] < .02 for b in active_boxes.values()
        ):
            raise HTTPException(400, "invalid slot boxes")
        publish_event({"type": "scan_started", "mode": mode})

        def on_progress(done_labels: list[str]) -> None:
            publish_event({"type": "scan_progress", "labels": done_labels})

        try:
            slot_items, capacities = _slot_expectations()
            result = run_scan(
                mode=mode, image_path=str(resolved) if resolved else None,
                camera_index=camera_index, variant=variant, strategy=strategy,
                on_progress=on_progress, slot_items=slot_items, capacities=capacities,
                boxes=active_boxes,
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
            capture_path = CAPTURES_DIR / f"scan-{uuid4().hex}.jpg"
            cv2.imwrite(str(capture_path), result.frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            stored_image_path = str(capture_path.relative_to(SERVER_DIR))
        else:
            stored_image_path = str(Path(result.image_path).relative_to(SERVER_DIR))

        # Every real image is only a proposal. Legacy mock-only automation can
        # still replay the demo; both interactive apps request review for replays.
        if mode != "mock" or review:
            proposal = pantry_review.stage(baseline=baseline, image_path=stored_image_path,
                                          boxes=active_boxes, result=result, mode=mode)
            publish_event({"type": "scan_pending", "proposal_id": proposal.id})
            return {
                "proposal_id": proposal.id, "snapshot_ts": None, "mode": mode,
                "strategy": result.strategy, "elapsed_s": round(result.elapsed_s, 1),
                "warnings": result.warnings or [], "boxes": active_boxes,
                "slots": [{"slot": label, "count": reading.count,
                           "confidence": reading.confidence, "needs_confirmation": True}
                          for label, reading in result.readings.items()],
            }

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
            "autonomy_days": autonomy, "slots": out, "warnings": result.warnings or [],
        })
        return {
            "snapshot_ts": snapshot_ts,
            "mode": mode,
            "strategy": result.strategy,
            "elapsed_s": round(result.elapsed_s, 1),
            # about the photo itself (blur, light); empty for replay scans
            "warnings": result.warnings or [],
            "autonomy_days": autonomy,
            "slots": out,
        }
    finally:
        _scan_lock.release()


def _record_delta(session: Session, food_item_id: int, delta: int, snapshot_ts: datetime) -> None:
    """Turn a count change between two scans into a stock event: boxes taken
    off the shelf (negative) or put back (positive). A box is a whole lot at
    the demo scale, so it is never attributed to one person's meal: meals are
    logged in portions by the crew app (demo_rules.json, "meals")."""
    if delta != 0:
        session.add(ConsumptionEvent(ts=snapshot_ts, food_item_id=food_item_id, qty=delta))


MAX_UPLOAD_BYTES = 20 * 1024 * 1024
UPLOAD_MAX_WIDTH = 1600


@router.post("/photo")
def scan_photo(
    file: UploadFile = File(...),
    scan: bool = True,
    strategy: str | None = None,
    frame: str | None = Form(default=None),
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
    boxes = None
    if frame is not None:
        try:
            bounds = GridFrameBody.model_validate_json(frame)
            boxes = boxes_from_frame(bounds)
        except ValueError as exc:
            raise HTTPException(400, "invalid shelf frame") from exc
    path = CAPTURES_DIR / f"photo-{uuid4().hex}.jpg"
    cv2.imwrite(str(path), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    relative = str(path.relative_to(SERVER_DIR))

    if scan:
        return scan_pantry(mode="image", image_path=relative, strategy=strategy, boxes=boxes)

    with Session(engine) as session:
        session.connection().exec_driver_sql("BEGIN IMMEDIATE")
        previous = _latest_snapshot(session)
        carried = pending_portions(session, previous) if previous else {}
        snapshot = InventorySnapshot(ts=now, image_path=relative, raw_json=json.dumps({
            "reference_only": True,
            "carried_meals": {str(food): qty for food, qty in carried.items()},
        }))
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
    rows: int = Field(default=3, ge=1, le=3)
    columns: int = Field(default=4, ge=1, le=4)


def boxes_from_frame(body: GridFrameBody) -> dict:
    """Fast calibration for a real shelf: give the outer frame, get 3 x 4 equal slots."""
    if body.right - body.left < 0.2 - 1e-6 or body.bottom - body.top < 0.2 - 1e-6:
        raise HTTPException(400, "frame is too small or inverted")
    col_w = (body.right - body.left) / body.columns
    row_h = (body.bottom - body.top) / body.rows
    boxes = {}
    for r, row in enumerate("ABC"[:body.rows]):
        for c in range(body.columns):
            boxes[f"{row}{c + 1}"] = (
                round(body.left + c * col_w, 4), round(body.top + r * row_h, 4),
                round(body.left + (c + 1) * col_w, 4), round(body.top + (r + 1) * row_h, 4),
            )
    return boxes


@router.put("/grid-frame")
def set_grid_from_frame(body: GridFrameBody) -> dict[str, list[float]]:
    vision_grid.save_boxes(boxes_from_frame(body))
    publish_event({"type": "grid_changed"})
    return vision_grid.load_boxes()


class ReviewBody(BaseModel):
    counts: dict[str, StrictInt]
    replace_stock: bool = False


@router.get("/review/{proposal_id}/image")
def review_image(proposal_id: str):
    with pantry_review.lock:
        try:
            proposal = pantry_review.get(proposal_id)
        except ValueError as exc:
            raise HTTPException(410, str(exc)) from exc
        return FileResponse(SERVER_DIR / proposal.image_path)


@router.delete("/review/{proposal_id}")
def discard_review(proposal_id: str):
    with pantry_review.lock:
        pantry_review.discard(proposal_id)
    return {"discarded": True}


@router.post("/review/{proposal_id}")
def save_review(proposal_id: str, body: ReviewBody):
    with pantry_review.lock:
        try:
            proposal = pantry_review.get(proposal_id)
        except ValueError as exc:
            raise HTTPException(410, str(exc)) from exc
        with Session(engine) as session:
            try:
                snapshot = pantry_review.apply(session, proposal, body.counts, replace_stock=body.replace_stock)
            except ValueError as exc:
                raise HTTPException(409, str(exc)) from exc
            ts = snapshot.ts.isoformat()
        pantry_review.discard(proposal_id)
    publish_event({"type": "scan_complete", "snapshot_ts": ts})
    return {"snapshot_ts": ts}


class EmptyStockBody(BaseModel):
    confirmed: bool = False


@router.post("/empty")
def empty_stock(body: EmptyStockBody):
    if not body.confirmed:
        raise HTTPException(400, "Confirm before emptying stock.")
    with Session(engine) as session:
        snapshot = pantry_setup.empty_stock(session)
        ts = snapshot.ts.isoformat()
    publish_event({"type": "stock_emptied", "snapshot_ts": ts})
    return {"snapshot_ts": ts}


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
            new_food = body.food_item_id or None
            if new_food != slot.food_item_id:
                # Reusing an old quantity for a new product is not a checked count.
                snapshot = _latest_snapshot(session)
                if snapshot:
                    line = session.exec(select(InventoryLine).where(
                        InventoryLine.snapshot_id == snapshot.id, InventoryLine.slot_id == slot.id
                    )).first()
                    if line:
                        line.confidence = 0
                        line.source = "configuration_changed"
                        session.add(line)
            slot.food_item_id = new_food
        session.add(slot)
        session.commit()
        session.refresh(slot)
        publish_event({"type": "slot_configuration_changed", "slot": slot.label})
        return slot


class FoodItemBody(BaseModel):
    name: str = Field(min_length=2, max_length=40)
    kcal: float = Field(ge=0, le=20000)
    protein_g: float = Field(default=0, ge=0, le=2000)
    carbs_g: float = Field(default=0, ge=0, le=5000)
    fat_g: float = Field(default=0, ge=0, le=2000)

    @field_validator("name")
    @classmethod
    def meaningful_name(cls, value: str) -> str:
        if len(value.strip()) < 2:
            raise ValueError("Use at least two non-space characters.")
        return value.strip()


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


@router.put("/items/{food_id}")
def update_item(food_id: int, body: FoodItemBody) -> FoodItem:
    with Session(engine) as session:
        try:
            item = pantry_setup.update_product(session, food_id, body.model_dump())
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc
    publish_event({"type": "catalogue_updated"})
    return item


class ScaleBody(BaseModel):
    multiplier: StrictInt = Field(ge=1, le=10000)


@router.put("/scale")
def update_scale(body: ScaleBody) -> dict:
    with Session(engine) as session:
        pantry_setup.set_scale(session, body.multiplier)
    publish_event({"type": "catalogue_updated"})
    return {"multiplier": body.multiplier}


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
                # a meal is counted in portions, a scan in boxes (= lots at the demo scale)
                "unit": "portion" if is_meal(e) else "box",
            }
            for e in events
        ]


@router.get("/snapshot-image")
def get_snapshot_image() -> FileResponse:
    with Session(engine) as session:
        snapshot = _latest_snapshot(session)
    if snapshot and not snapshot.image_path and json.loads(snapshot.raw_json or "{}").get("stock_emptied"):
        raise HTTPException(404, "No current shelf photo.")
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

