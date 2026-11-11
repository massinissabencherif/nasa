from sqlmodel import Field, SQLModel


class MissionContext(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    type: str
    label: str
    delay_s: int
    radiation_msv_day: float
    resupply_days: int | None = None
    # Demo assumption: days until the next scheduled cargo (None = no resupply at all).
    next_resupply_in_days: int | None = None
    active: bool = False
    time_scale: float = 1.0  # demo acceleration factor applied to delay_s for new Earth messages
    use_llm_advice: bool = False  # opt-in; deterministic template is the default (PROMPT_ADDENDUM.md #2)
