from pydantic import BaseModel, Field

class DailyMenuItemOut(BaseModel):
    item_id: int
    name: str
    price: int
    total_qty: int = Field(default=0, ge=0)
    remaining_qty: int = Field(default=0, ge=0)

class DailyMenuOut(BaseModel):
    date: str
    items: list[DailyMenuItemOut]