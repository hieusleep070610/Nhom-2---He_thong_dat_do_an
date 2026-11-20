from datetime import date, datetime, time
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class ServingCheckItem(BaseModel):
    dish_id: int = Field(..., gt=0, description="Mã món cần kiểm tra")
    quantity: int = Field(..., ge=1, le=999, description="Số suất muốn đặt")


class ServingCheckRequest(BaseModel):
    menu_date: date = Field(..., description="Ngày nhận món")
    items: list[ServingCheckItem] = Field(..., min_length=1)


class RemainingMenuItem(BaseModel):
    dish_id: int
    dish_name: str
    planned_quantity: int
    ordered_quantity: int
    remaining_quantity: int
    is_available: bool


class RemainingMenuResponse(BaseModel):
    menu_date: date
    items: list[RemainingMenuItem]


class PickupSlotAvailability(BaseModel):
    pickup_slot_id: int
    label: str
    start_time: time
    end_time: time
    max_servings: int
    booked_servings: int
    remaining_servings: int
    is_active: bool
    is_full: bool
    is_past: bool
    can_book: bool


class PickupSlotsResponse(BaseModel):
    service_date: date
    slots: list[PickupSlotAvailability]


class DishPriceUpdateRequest(BaseModel):
    new_price: Decimal = Field(..., gt=0, description="Giá mới của món ăn (VNĐ)")
    reason: str | None = Field(default=None, max_length=255, description="Lý do thay đổi giá")


class DishPriceHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dish_id: int
    old_price: Decimal | None = None
    new_price: Decimal
    reason: str | None = None
    changed_by: str | None = None
    changed_at: datetime


class DishPriceUpdateResponse(BaseModel):
    message: str
    dish_id: int
    dish_name: str
    old_price: Decimal
    new_price: Decimal
    history: DishPriceHistoryItem


class DishPriceHistoryResponse(BaseModel):
    dish_id: int
    dish_name: str
    current_price: Decimal
    history: list[DishPriceHistoryItem]