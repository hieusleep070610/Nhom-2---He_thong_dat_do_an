import bcrypt
import jwt

from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.db import get_db
from app.models.user import User
from app.models.role import Role


security_bearer = HTTPBearer(auto_error=False)


# =========================
# 1. MÃ HÓA MẬT KHẨU
# =========================

def hash_password(password: str) -> str:

    salt = bcrypt.gensalt()

    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        salt
    )

    return hashed.decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )

    except ValueError:
        return False


# =========================
# 2. TẠO JWT
# =========================

def create_access_token(user: User, role_name: str) -> str:

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role_id": user.role_id,
        "role": role_name,
        "exp": expire
    }

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return token


# =========================
# 3. XÁC THỰC JWT
# =========================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db)
):

    if credentials is None:

        raise HTTPException(
            status_code=401,
            detail="Chưa đăng nhập"
        )

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = int(payload.get("sub"))

    except (jwt.InvalidTokenError, ValueError, TypeError):

        raise HTTPException(
            status_code=401,
            detail="Token không hợp lệ hoặc đã hết hạn"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Tài khoản không tồn tại"
        )

    return user


# =========================
# 4. LẤY VAI TRÒ HIỆN TẠI
# =========================

def get_current_role(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role = db.query(Role).filter(
        Role.role_id == current_user.role_id
    ).first()

    if role is None:

        raise HTTPException(
            status_code=403,
            detail="Tài khoản chưa được phân quyền"
        )

    return role.role_name


# =========================
# 5. KIỂM TRA QUYỀN
# =========================

def require_roles(*allowed_roles):

    def role_checker(
        current_role: str = Depends(get_current_role)
    ):

        if current_role not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="Bạn không có quyền truy cập chức năng này"
            )

        return current_role

    return role_checker