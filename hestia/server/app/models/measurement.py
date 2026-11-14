from datetime import datetime

from sqlmodel import Field, SQLModel


class Measurement(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ts: datetime
    crew_member_id: int = Field(foreign_key="crewmember.id")
    type: str  # systolic_bp, diastolic_bp, heart_rate, glucose, temperature,
    # weight, sleep_h, mood, exercise_min, radiation_dose_msv, symptom
    value: float
    unit: str
    source: str  # manual | camera | simulated
    note: str | None = None  # e.g. symptom label
