from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class InventoryItemResponse(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str | None = None
    stock_quantity: Decimal
    min_stock: Decimal
    is_active: bool
    is_low_stock: bool
    deficit_quantity: Decimal
    warning: str | None = None


class RestockRequest(BaseModel):
    quantity: Decimal = Field(..., gt=0, description="Số lượng nhập thêm (> 0)")
    note: str | None = Field(default=None, max_length=255)


class RestockResponse(InventoryItemResponse):
    action: Literal["restock"] = "restock"
    previous_stock: Decimal
    delta_quantity: Decimal
    note: str | None = None


class AdjustStockRequest(BaseModel):
    mode: Literal["set", "delta"] = Field(
        default="set",
        description="'set': đặt trực tiếp tồn kho mới; 'delta': cộng/trừ chênh lệch",
    )
    quantity: Decimal = Field(..., description="Số lượng tồn mới (>= 0) hoặc lượng chênh lệch")
    reason: str | None = Field(default=None, max_length=255)


class AdjustStockResponse(InventoryItemResponse):
    action: Literal["adjust"] = "adjust"
    mode: Literal["set", "delta"]
    previous_stock: Decimal
    delta_quantity: Decimal
    reason: str | None = None