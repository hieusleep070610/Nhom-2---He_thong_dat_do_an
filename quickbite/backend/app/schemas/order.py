from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OrderCreateItem(BaseModel):
    dish_id: int = Field(..., gt=0)
    quantity: int = Field(..., ge=1, le=10)


class OrderCreate(BaseModel):
    pickup_date: date
    pickup_slot_id: int = Field(..., gt=0)
    items: list[OrderCreateItem] = Field(..., min_length=1, max_length=50)
    coupon_code: str | None = Field(default=None, max_length=40)
    payment_method: Literal["wallet"] = "wallet"
    note: str | None = Field(default=None, max_length=200)


class CreatedOrderItem(BaseModel):
    dish_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class CreatedOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    order_code: str
    status: str
    payment_status: str
    payment_method: str
    subtotal: Decimal
    discount: Decimal
    total_amount: Decimal
    pickup_date: date
    pickup_slot_id: int
    items: list[CreatedOrderItem]


class OrderStatusUpdate(BaseModel):
    new_status: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Trạng thái mới của đơn hàng"
    )
