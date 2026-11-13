from sqlalchemy import Column, Integer, String, DateTime

from app.database.db import Base


class User(Base):

    __tablename__ = "user"

    id = Column(
        "User_ID",
        Integer,
        primary_key=True,
        autoincrement=True
    )

    username = Column(
        "Username",
        String(100),
        nullable=False,
        unique=True
    )

    password_hash = Column(
        "Password_hash",
        String(250),
        nullable=False
    )

    full_name = Column(
        "Fullname",
        String(100),
        nullable=False
    )

    phone_number = Column(
        "Phone_Number",
        String(20)
    )

    address = Column(
        "Address",
        String(255)
    )

    created_at = Column(
        "Created_At",
        DateTime
    )

    role_id = Column(
        "Role_ID",
        Integer,
        nullable=False
    )