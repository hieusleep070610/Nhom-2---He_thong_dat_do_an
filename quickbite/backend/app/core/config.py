from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "he thong dat do an"

    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "cellfite90"
    DB_NAME: str = "quickbite_db_demo"

    CORS_ORIGINS: str = "*"
    ADMIN_USER_IDS: str = ""

    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_ignore_empty=True,
        extra="ignore",
    )

    @field_validator("DB_PASSWORD", mode="before")
    @classmethod
    def strip_password(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("SECRET_KEY")
    @classmethod
    def require_private_secret(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be a private value of at least 32 characters")
        return value

    @property
    def DATABASE_URL(self) -> str:
        password = quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+pymysql://{self.DB_USER}:{password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [item.strip() for item in self.CORS_ORIGINS.split(",") if item.strip()]
        return origins or ["*"]

    @property
    def admin_user_ids(self) -> set[int]:
        try:
            return {int(value.strip()) for value in self.ADMIN_USER_IDS.split(",") if value.strip()}
        except ValueError as error:
            raise ValueError("ADMIN_USER_IDS must be a comma-separated list of user IDs") from error


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
