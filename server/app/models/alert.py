from datetime import datetime

from sqlmodel import Field, SQLModel


class Alert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime
    crew_member_id: int = Field(foreign_key="crewmember.id")
    level: str  # green | orange | red
    indicator: str
    message: str
    sent_to_earth: bool = False
    acked: bool = False
