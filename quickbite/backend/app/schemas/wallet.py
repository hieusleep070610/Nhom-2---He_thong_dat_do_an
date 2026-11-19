from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class WalletBase(BaseModel):
    balance: int = Field(default=0, ge=0, examples=[1250000])
    xu: int = Field(default=0, ge=0, examples=[450])
    status: str = Field(default="active", examples=["active"])

class WalletCreate(WalletBase):
    user_id: int = Field(..., examples=[1])

class WalletUpdate(BaseModel):
    balance: int | None = Field(default=None, ge=0)
    xu: int | None = Field(default=None, ge=0)
    status: str | None = None

class WalletOut(WalletBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    balance: Decimal
    status: str
        
class PaymentRequest(BaseModel):
    wallet_id: int = Field(..., gt=0)
    amount: int | None = Field(default=None)
    order_id: int = Field(..., gt=0, description="ID của đơn hàng cần thanh toán")

    