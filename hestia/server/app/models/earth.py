from datetime import datetime

from sqlmodel import Field, SQLModel


class EarthMessage(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_ts: datetime
    deliver_ts: datetime  # one-way arrival at Earth
    reply_ts: datetime  # round-trip: when the simulated reply reaches the crew
    payload: str  # compact structured summary (<=600 chars + JSON)
    reply_payload: str  # scripted simulated ground reply, revealed at reply_ts
    status: str = "queued"  # queued | delivered | replied (display-only; derived from ts in the API)
    alert_id: int | None = Field(default=None, foreign_key="alert.id")
