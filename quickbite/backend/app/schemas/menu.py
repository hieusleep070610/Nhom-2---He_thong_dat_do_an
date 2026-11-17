from datetime import date

from pydantic import BaseModel, Field


class ServingCheckItem(BaseModel):
    dish_id: int = Field(..., gt=0, description="Mã món cần kiểm tra")
    quantity: int = Field(..., ge=1, le=999, description="Số suất muốn đặt")


class ServingCheckRequest(BaseModel):
    menu_date: date = Field(..., description="Ngày nhận món")
    items: list[ServingCheckItem] = Field(..., min_length=1)
