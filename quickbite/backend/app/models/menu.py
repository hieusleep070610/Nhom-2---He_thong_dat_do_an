from sqlalchemy import Column, Index, Integer, String, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base

# =============================================================================
# TF1B47E: [BE] Tối ưu truy vấn thực đơn — Model + Index
# Thêm composite index và index bổ sung để tăng tốc truy vấn theo ngày
# =============================================================================

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    price = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    # TF1B47E: index riêng is_available để lọc nhanh món đang bán
    is_available = Column(Boolean, default=True, index=True)

    daily_menus = relationship(
        "DailyMenu",
        back_populates="dish",
        cascade="all, delete-orphan",
        # TF1B47E: lazy="joined" → SQLAlchemy tự JOIN, tránh N+1 query
        lazy="joined",
    )


class DailyMenu(Base):
    __tablename__ = "daily_menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_date = Column(Date, nullable=False, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    dish = relationship("Dish", back_populates="daily_menus", lazy="joined")

    # TF1B47E: Composite index (menu_date, dish_id) — truy vấn thực đơn theo ngày
    # dùng cả hai cột → MySQL có thể dùng index covering scan thay vì full table scan
    __table_args__ = (
        Index("ix_daily_menus_date_dish", "menu_date", "dish_id"),
    )