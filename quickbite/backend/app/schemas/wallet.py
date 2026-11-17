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
    id: int
    user_id: int
    balance: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)
        
class PaymentRequest(BaseModel):
    wallet_id: int
    amount: int | None = Field(
        default=None,
        description="Không được dùng để trừ tiền. Hệ thống lấy total_amount của đơn.",
    )
    order_id: int