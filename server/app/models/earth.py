from datetime import datetime

from sqlmodel import Field, SQLModel


class EarthMessage(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_ts: datetime
    deliver_ts: datetime
    payload: str  # compact structured summary (<=600 chars + JSON)
    status: str = "queued"  # queued | delivered | replied
    alert_id: int | None = Field(default=None, foreign_key="alert.id")
