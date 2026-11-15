from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db

from app.schemas.auth_schemas import (
    LoginRequest,
    LoginResponse
)

from app.services.auth_services import login_user

from app.core.security import (
    get_current_user,
    get_current_role,
    require_roles
)

from app.models.user import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================
# 1. API ĐĂNG NHẬP
# =========================

@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    result = login_user(
        db,
        data.identifier,
        data.password
    )

    if result is None:

        raise HTTPException(
            status_code=401,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )

    return result


# =========================
# 2. API LẤY THÔNG TIN USER
# =========================

@router.get("/me")
def get_my_information(
    current_user: User = Depends(get_current_user),
    current_role: str = Depends(get_current_role)
):

    return {
        "message": "Xác thực thành công",
        "user_id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role_id": current_user.role_id,
        "role": current_role
    }


# =========================
# 3. API DÀNH CHO KHÁCH HÀNG
# =========================

@router.get(
    "/customer",
    dependencies=[
        Depends(require_roles("Customer"))
    ]
)
def customer_dashboard():

    return {
        "message": "Chào mừng khách hàng",
        "role": "Customer",
        "permission": "Được phép sử dụng chức năng khách hàng"
    }


# =========================
# 4. API DÀNH CHO NHÀ BẾP
# =========================

@router.get(
    "/kitchen",
    dependencies=[
        Depends(require_roles("Staff"))
    ]
)
def kitchen_dashboard():

    return {
        "message": "Chào mừng nhân viên nhà bếp",
        "role": "Staff",
        "permission": "Được phép sử dụng chức năng nhà bếp"
    }


# =========================
# 5. API DÀNH CHO QUẢN LÝ
# =========================

@router.get(
    "/manager",
    dependencies=[
        Depends(require_roles("Admin"))
    ]
)
def manager_dashboard():

    return {
        "message": "Chào mừng quản lý hệ thống",
        "role": "Admin",
        "permission": "Được phép quản lý hệ thống"
    }