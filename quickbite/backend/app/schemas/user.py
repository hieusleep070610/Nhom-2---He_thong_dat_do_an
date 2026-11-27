from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    phone: str | None = Field(default=None, max_length=20)


class UserLogin(BaseModel):
    account: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=1)


class UserResponse(UserBase):
    email: str
    id: int = Field(validation_alias="user_id")
    phone: str | None = None
    address: str | None = None
    role_id: int | None = None
    role: str | None = None
    roles: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserAddressUpdate(BaseModel):
    address: str | None = Field(default=None, max_length=500)


class UserRoleUpdate(BaseModel):
    role_id: int = Field(..., ge=1, le=3)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
