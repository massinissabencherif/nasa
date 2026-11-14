from sqlmodel import Field, SQLModel


class FoodItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    mass_g: float
    expiry_days: int
    # Demo-scale multiplier: one physical unit on the shelf represents
    # units_per_lot real rations (see PROMPT_ADDENDUM.md §1).
    units_per_lot: float = 1.0
    note: str | None = None
