from datetime import date, time

from pydantic import BaseModel, Field


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
    remaining_servings: int
    is_active: bool
    is_full: bool


class PickupSlotsResponse(BaseModel):
    service_date: date
    slots: list[PickupSlotAvailability]
