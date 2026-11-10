from pydantic import BaseModel, Field, ValidationError

__all__ = ["SlotReading", "ValidationError"]


class SlotReading(BaseModel):
    count: int = Field(ge=0)
    confidence: float = Field(ge=0, le=1)
    note: str = ""
