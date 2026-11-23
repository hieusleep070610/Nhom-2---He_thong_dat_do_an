from decimal import Decimal

from pydantic import BaseModel, Field


class RecipeIngredientInput(BaseModel):
    ingredient_id: int = Field(gt=0)
    quantity: Decimal = Field(gt=0)


class RecipeUpdate(BaseModel):
    ingredients: list[RecipeIngredientInput] = Field(min_length=1, max_length=100)
