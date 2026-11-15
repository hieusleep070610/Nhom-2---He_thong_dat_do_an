from sqlalchemy import Column, Integer, String

from app.database.db import Base


class Role(Base):

    __tablename__ = "role"

    role_id = Column(
        "Role_ID",
        Integer,
        primary_key=True
    )

    role_name = Column(
        "Role_Name",
        String(50),
        nullable=False
    )