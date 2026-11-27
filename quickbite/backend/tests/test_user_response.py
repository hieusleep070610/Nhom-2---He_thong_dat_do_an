from datetime import datetime
from types import SimpleNamespace

from app.services.user_services import to_user_response


def test_user_response_includes_role_details_for_existing_users():
    user = SimpleNamespace(
        user_id=42,
        email="demo@quickbite.local",
        full_name="Existing User",
        phone=None,
        address=None,
        roles=[
            SimpleNamespace(id=3, name="customer"),
            SimpleNamespace(id=1, name="admin"),
        ],
        created_at=datetime(2026, 1, 1),
    )

    response = to_user_response(user)

    assert response.id == 42
    assert response.email == "demo@quickbite.local"
    assert response.role_id == 1
    assert response.role == "admin"
    assert response.roles == ["admin", "customer"]
