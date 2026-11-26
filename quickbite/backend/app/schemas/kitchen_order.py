from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class OrderStatusEnum(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class KitchenDecisionEnum(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"


class KitchenOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_code: str
    item_name: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal


class KitchenPickupSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    label: str
    start_time: time
    end_time: time


class KitchenOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    customer_name: str
    customer_phone: str
    note: str | None = None
    pickup_date: date
    pickup_slot_id: int
    pickup_slot: KitchenPickupSlotResponse | None = None
    status: OrderStatusEnum
    payment_method: str | None = None
    payment_status: str | None = None
    discount_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    items: list[KitchenOrderItemResponse] = []


class KitchenOrderDecisionRequest(BaseModel):
    action: KitchenDecisionEnum
    reason: str | None = Field(
        default=None,
        max_length=150,
        description="Bắt buộc khi từ chối đơn (action='reject')",
    )


class KitchenOrderDecisionResponse(BaseModel):
    order_id: int
    code: str
    previous_status: OrderStatusEnum
    current_status: OrderStatusEnum
    note: str | None = None
    message: str