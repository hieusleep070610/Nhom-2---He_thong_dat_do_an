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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    code = Column(String(20), nullable=False, unique=True)
    customer_name = Column(String(80), nullable=False)
    customer_phone = Column(String(15), nullable=False)
    delivery_address = Column(String(500), nullable=True)
    note = Column(String(200))
    pickup_date = Column(Date, nullable=False)
    pickup_slot_id = Column(BigInteger, ForeignKey("pickup_slots.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True, index=True)
    payment_method = Column(String(20), nullable=True)
    payment_status = Column(String(20), nullable=False, server_default="unpaid")
    discount_amount = Column(Numeric(12, 0), nullable=False, server_default="0")
    idempotency_key = Column(String(100), nullable=True)
    request_hash = Column(String(64), nullable=True)
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
    customer = relationship("User")
    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_orders_idempotency_key"),
        CheckConstraint(
            "customer_phone REGEXP '^0[0-9]{8,10}$'",
            name="chk_orders_phone",
        ),
        CheckConstraint("total_amount >= 0", name="chk_orders_total"),
    )
