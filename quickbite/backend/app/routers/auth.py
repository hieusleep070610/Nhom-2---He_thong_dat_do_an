from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_access_token, verify_password
from app.database.db import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.user import (
    TokenResponse,
    UserAddressUpdate,
    UserCreate,
    UserLogin,
    UserResponse,
    UserRoleUpdate,
)
from app.services import user_services

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer = HTTPBearer(auto_error=False)


def _token_for(user) -> TokenResponse:
    token = create_access_token({"sub": str(user.user_id)})
    return TokenResponse(access_token=token, user=_user_response(user))


def _user_response(user) -> UserResponse:
    return user_services.to_user_response(user)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if user_services.get_user_by_email(db, str(data.email)):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    phone = (data.phone or "").strip()
    if phone and user_services.get_user_by_phone(db, phone):
        raise HTTPException(status_code=400, detail="Số điện thoại đã tồn tại")
    user = user_services.create_user(db, data)
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    account = data.account.strip()
    user = user_services.get_user_by_email(db, account)
    if user is None:
        user = user_services.get_user_by_phone(db, account)
    if user is None or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Số điện thoại, email hoặc mật khẩu không đúng")
    return _token_for(user)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập")
    payload = verify_access_token(credentials.credentials)
    user_id = payload.get("sub")
    user = user_services.get_user_by_id(db, int(user_id)) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ")
    return user


def has_role(user, *role_names: str) -> bool:
    return any(role.name in role_names for role in user.roles)


def get_current_admin(user=Depends(get_current_user)):
    if not has_role(user, "admin"):
        raise HTTPException(status_code=403, detail="Bạn không có quyền quản trị.")
    return user


def get_current_kitchen_staff(user=Depends(get_current_user)):
    if not has_role(user, "admin", "kitchen"):
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc nhân viên bếp được thực hiện thao tác này.")
    return user


def get_current_customer(user=Depends(get_current_user)):
    if not has_role(user, "customer"):
        raise HTTPException(status_code=403, detail="Chức năng này chỉ dành cho khách hàng.")
    return user


@router.put("/users/{user_id}/role", response_model=UserResponse)
def assign_user_role(
    user_id: int,
    data: UserRoleUpdate,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    role = db.get(Role, data.role_id)
    if user is None or role is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản hoặc vai trò.")
    user.roles = [role]
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.get("/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    return _user_response(user)


@router.put("/me", response_model=UserResponse)
def update_me(data: UserAddressUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    user.address = (data.address or "").strip() or None
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_response(user)
