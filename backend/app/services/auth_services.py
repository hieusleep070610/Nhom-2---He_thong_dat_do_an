from sqlalchemy.orm import Session

from app.models.user import User
from app.models.role import Role

from app.core.security import (
    verify_password,
    hash_password,
    create_access_token
)


def login_user(
    db: Session,
    identifier: str,
    password: str
):

    # Tìm tài khoản bằng username hoặc số điện thoại

    user = db.query(User).filter(
        (User.username == identifier) |
        (User.phone_number == identifier)
    ).first()

    if user is None:

        return None

    # Lấy vai trò của người dùng

    role = db.query(Role).filter(
        Role.role_id == user.role_id
    ).first()

    if role is None:

        return None

    # Kiểm tra mật khẩu
    # Hỗ trợ dữ liệu mẫu cũ đang lưu mật khẩu thường.
    # Sau khi đăng nhập thành công sẽ chuyển sang bcrypt.

    stored_password = user.password_hash

    is_valid = False

    if stored_password.startswith(("$2a$", "$2b$", "$2y$")):

        is_valid = verify_password(
            password,
            stored_password
        )

    else:

        is_valid = password == stored_password

        if is_valid:

            user.password_hash = hash_password(password)

            db.commit()

    if not is_valid:

        return None

    # Tạo JWT

    access_token = create_access_token(
        user,
        role.role_name
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "role_id": user.role_id,
            "role_name": role.role_name
        }
    }