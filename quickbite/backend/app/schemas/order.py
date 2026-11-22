from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal
from typing import List, Optional
from datetime import date, datetime

class OrderStatusUpdate(BaseModel):
    new_status: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Trạng thái mới của đơn hàng"
    )
class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_code: str
    item_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal


class OrderSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    status: str
    total_amount: Decimal
    pickup_date: date
    pickup_slot_id: int
    created_at: datetime


class OrderDetailResponse(OrderSummaryResponse):
    customer_name: str
    customer_phone: str
    note: Optional[str] = None
    updated_at: datetime
    items: List[OrderItemResponse] = []


class PaginatedOrderResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[OrderSummaryResponse]