from datetime import datetime, timezone
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class APIResponse(BaseModel, Generic[T]):
    statusCode: int
    error: str | None = None
    message: str
    data: T | None = None
    path: str
    timestamp: datetime = Field(default_factory=get_utc_now)
