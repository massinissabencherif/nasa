from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class ReactionSession(SQLModel, table=True):
    id: str = Field(primary_key=True)
    crew_member_id: int = Field(foreign_key="crewmember.id", index=True)
    protocol_version: str = Field(index=True)
    device_id: str | None = Field(default=None, index=True)
    started_at: datetime = Field(index=True)
    ended_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str
    source: str
    practice_completed: int
    median_ms: float | None = None
    valid_responses: int = 0
    false_starts: int = 0
    no_responses: int = 0
    request_hash: str


class ReactionTrial(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="reactionsession.id", index=True)
    attempt: int
    trial_number: int
    outcome: str
    reaction_ms: float | None = None
