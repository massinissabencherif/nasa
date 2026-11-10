from sqlmodel import Field, SQLModel


class CrewMember(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    sex: str  # "M" | "F"
    age: int
    height_cm: float
    weight_kg: float
    activity_factor: float
    avatar: str
