from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy_utils import create_database, database_exists

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Tạo database (nếu chưa có) và các bảng còn thiếu."""
    from app import models  # noqa: F401 - đăng ký model trước create_all

    if not database_exists(engine.url):
        create_database(engine.url)
    Base.metadata.create_all(bind=engine)
    _ensure_user_phone_column()


def _ensure_user_phone_column() -> None:
    """Bảng users cũ chưa có cột phone. Thêm cột khi còn thiếu."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    if "phone" in columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL"))
        connection.execute(text("CREATE UNIQUE INDEX uq_users_phone ON users (phone)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
