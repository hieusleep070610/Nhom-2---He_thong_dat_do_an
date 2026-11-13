from pydantic import BaseModel, Field


class LoginRequest(BaseModel):

    identifier: str = Field(
        ...,
        min_length=1,
        description="Username hoặc số điện thoại"
    )

    password: str = Field(
        ...,
        min_length=1
    )


class LoginUserResponse(BaseModel):

    id: int
    username: str
    full_name: str
    phone_number: str | None
    role_id: int
    role_name: str


class LoginResponse(BaseModel):

    access_token: str
    token_type: str = "bearer"
    user: LoginUserResponse