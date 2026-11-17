from pydantic import BaseModel, Field

class OrderStatusUpdate(BaseModel):
    new_status: str = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Trạng thái mới của đơn hàng"
    )
