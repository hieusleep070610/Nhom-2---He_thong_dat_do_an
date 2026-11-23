from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class IngredientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=20)
    stock_quantity: Decimal = Field(ge=0)
    min_stock: Decimal = Field(default=0, ge=0)

    @field_validator("name", "unit")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value


class IngredientUpdate(IngredientCreate):
    pass
