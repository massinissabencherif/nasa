from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class SimulationReport(SQLModel, table=True):
    """A frozen management-simulator run: the inputs the person confirmed, the
    mission context and stock at that moment, and the forecast computed from
    them. Stored as JSON so a later change of stock or context never rewrites
    an old report."""

    id: int | None = Field(default=None, primary_key=True)
    created_ts: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    context_type: str
    context_label: str
    inputs_json: str
    result_json: str
