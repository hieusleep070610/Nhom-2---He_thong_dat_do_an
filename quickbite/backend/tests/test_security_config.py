import pytest
from pydantic import ValidationError

from app.core.config import Settings


def build_settings(**overrides):
    settings = {
        "DB_USER": "app_user",
        "DB_PASSWORD": "test-password",
        "CORS_ORIGINS": "http://localhost:5500",
        "SECRET_KEY": "test-secret-key-with-at-least-32-characters",
    }
    settings.update(overrides)
    return Settings(_env_file=None, **settings)


def test_cors_origins_require_an_explicit_allowlist():
    with pytest.raises(ValidationError, match="must contain explicit origins"):
        build_settings(CORS_ORIGINS="*")


def test_cors_origin_list_parses_only_configured_origins():
    settings = build_settings(CORS_ORIGINS="https://frontend.example, http://localhost:5500")

    assert settings.cors_origin_list == [
        "https://frontend.example",
        "http://localhost:5500",
    ]


def test_database_credentials_are_required():
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            CORS_ORIGINS="http://localhost:5500",
            SECRET_KEY="test-secret-key-with-at-least-32-characters",
        )
