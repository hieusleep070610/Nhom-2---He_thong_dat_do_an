from typing import Optional
from pydantic import BaseModel, ConfigDict


class DishOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: float
    description: Optional[str] = None
    image_url: Optional[str] = None