from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, verify_access_token, verify_password
from app.database.db import get_db
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.services import user_services

router = APIRouter(prefix="/auth", tags=["Auth"])
bearer = HTTPBearer(auto_error=False)


def _token_for(user) -> TokenResponse:
    token = create_access_token({"sub": str(user.user_id)})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


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


def get_current_admin(user=Depends(get_current_user)):
    if user.user_id not in settings.admin_user_ids:
        raise HTTPException(status_code=403, detail="Bạn không có quyền quản trị.")
    return user


@router.get("/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    return user
