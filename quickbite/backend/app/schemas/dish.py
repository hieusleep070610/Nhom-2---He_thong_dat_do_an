from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DishResponse(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None
    is_available: Optional[bool] = True
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}

class DishOut(BaseModel):
    id: int
    name: str
    price: Decimal
    description: Optional[str] = None
    is_available: bool = True
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
