from datetime import datetime

from sqlmodel import Field, SQLModel


class ShelfSlot(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    label: str  # e.g. "A1"
    food_item_id: int | None = Field(default=None, foreign_key="fooditem.id")
    capacity: int


class InventorySnapshot(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime
    image_path: str | None = None
    raw_json: str | None = None


class InventoryLine(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    snapshot_id: int = Field(foreign_key="inventorysnapshot.id")
    slot_id: int = Field(foreign_key="shelfslot.id")
    count: int
    confidence: float = 1.0
    source: str = "simulated"  # simulated | camera | manual


class ConsumptionEvent(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime
    food_item_id: int = Field(foreign_key="fooditem.id")
    qty: int
    crew_member_id: int | None = Field(default=None, foreign_key="crewmember.id")
