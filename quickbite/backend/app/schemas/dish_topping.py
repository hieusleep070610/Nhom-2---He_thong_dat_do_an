from decimal import Decimal

from pydantic import BaseModel, Field


class DishToppingInput(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(default=Decimal("0"), ge=0, le=999999999999)


class DishToppingsUpdate(BaseModel):
    toppings: list[DishToppingInput] = Field(default_factory=list, max_length=20)
