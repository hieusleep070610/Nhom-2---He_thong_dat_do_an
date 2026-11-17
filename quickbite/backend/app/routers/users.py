"""API người dùng.

GET  /api/users     danh sách (tìm theo tên hoặc email: ?q=)
POST /api/users     thêm user
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.schemas.user_schemas import UserCreate, UserResponse
from app.services import user_services

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def list_users(q: str | None = None, db: Session = Depends(get_db)):
    return user_services.get_users(db, keyword=q)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if user_services.get_user_by_email(db, str(data.email)):
        raise HTTPException(status_code=400, detail="Email đã tồn tại")
    return user_services.create_user(db, data)
