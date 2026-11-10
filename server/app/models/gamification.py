from sqlmodel import Field, SQLModel


class Gamification(SQLModel, table=True):
    crew_member_id: int | None = Field(default=None, foreign_key="crewmember.id", primary_key=True)
    streak: int = 0
    badges_json: str = "[]"
    score: int = 0
