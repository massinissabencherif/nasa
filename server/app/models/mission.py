from sqlmodel import Field, SQLModel


class MissionContext(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    type: str
    label: str
    delay_s: int
    radiation_msv_day: float
    resupply_days: int | None = None
    active: bool = False
