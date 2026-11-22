from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index= True)
    code = Column(String(20), nullable=False, unique=True)
    customer_name = Column(String(80), nullable=False)
    customer_phone = Column(String(15), nullable=False)
    note = Column(String(200))
    pickup_date = Column(Date, nullable=False)
    pickup_slot_id = Column(BigInteger, ForeignKey("pickup_slots.id"), nullable=False)
    status = Column(
        Enum(
            "pending",
            "confirmed",
            "preparing",
            "ready",
            "completed",
            "cancelled",
            name="order_status",
        ),
        nullable=False,
        server_default="pending",
    )
    total_amount = Column(Numeric(12, 0), nullable=False, server_default="0")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    pickup_slot = relationship("PickupSlot", back_populates="orders")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "customer_phone REGEXP '^0[0-9]{8,10}$'",
            name="chk_orders_phone",
        ),
        CheckConstraint("total_amount >= 0", name="chk_orders_total"),
    )
