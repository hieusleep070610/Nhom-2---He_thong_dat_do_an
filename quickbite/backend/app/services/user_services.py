from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.services.role_service import assign_customer_role
from app.schemas.user import UserCreate


def get_users(db: Session, keyword: str | None = None) -> list[User]:
    query = select(User).order_by(User.user_id.desc())
    if keyword:
        like = f"%{keyword}%"
        query = query.where(or_(User.full_name.like(like), User.email.like(like)))
    return list(db.scalars(query))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_phone(db: Session, phone: str) -> User | None:
    return db.scalar(select(User).where(User.phone == phone))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.scalar(select(User).where(User.user_id == user_id))


def create_user(db: Session, data: UserCreate) -> User:
    user = User(
        email=str(data.email),
        phone=(data.phone or "").strip() or None,
        full_name=data.full_name,
        password=hash_password(data.password),
    )
    db.add(user)
    db.flush()
    assign_customer_role(db, user)
    db.commit()
    db.refresh(user)
    return user
