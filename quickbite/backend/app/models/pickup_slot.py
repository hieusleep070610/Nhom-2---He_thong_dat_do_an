from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class PickupSlot(Base):
    """Khung gio nhan. max_servings la gioi han suat moi ngay."""

    __tablename__ = "pickup_slots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    label = Column(String(5), nullable=False, unique=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_servings = Column(Integer, nullable=False)
    is_active = Column(Integer, nullable=False, default=1, server_default="1")

    daily_quotas = relationship("SlotDailyQuota", back_populates="pickup_slot")
    orders = relationship("Order", back_populates="pickup_slot")

    __table_args__ = (
        CheckConstraint("end_time > start_time", name="chk_pickup_slots_range"),
        CheckConstraint("max_servings > 0", name="chk_pickup_slots_max"),
    )


class SlotDailyQuota(Base):
    """So suat da giu cua mot khung gio trong mot ngay."""

    __tablename__ = "slot_daily_quotas"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pickup_slot_id = Column(BigInteger, ForeignKey("pickup_slots.id"), nullable=False)
    service_date = Column(Date, nullable=False)
    max_servings = Column(Integer, nullable=False)
    booked_servings = Column(Integer, nullable=False, default=0, server_default="0")

    pickup_slot = relationship("PickupSlot", back_populates="daily_quotas")

    __table_args__ = (
        UniqueConstraint("pickup_slot_id", "service_date", name="uq_slot_daily"),
        CheckConstraint("max_servings > 0", name="chk_slot_daily_max"),
        CheckConstraint(
            "booked_servings >= 0 AND booked_servings <= max_servings",
            name="chk_slot_daily_booked",
        ),
    )
