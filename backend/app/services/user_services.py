from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user_schemas import UserCreate


def get_users(db: Session, keyword: str | None = None) -> list[User]:
    query = select(User).order_by(User.id.desc())
    if keyword:
        like = f"%{keyword}%"
        query = query.where(or_(User.full_name.like(like), User.email.like(like)))
    return list(db.scalars(query))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def create_user(db: Session, data: UserCreate) -> User:
    user = User(
        email=str(data.email),
        full_name=data.full_name,
        password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
