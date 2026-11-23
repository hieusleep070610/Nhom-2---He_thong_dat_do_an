from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.db import Base


class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    price = Column(Numeric(12, 0), nullable=False)
    description = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)

    daily_menus = relationship("DailyMenu", back_populates="dish", cascade="all, delete-orphan")
    price_history = relationship(
        "DishPriceHistory",
        back_populates="dish",
        cascade="all, delete-orphan",
        order_by="desc(DishPriceHistory.changed_at), desc(DishPriceHistory.id)",
    )


class DishPriceHistory(Base):
    __tablename__ = "dish_price_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False, index=True)
    old_price = Column(Numeric(12, 0), nullable=True)
    new_price = Column(Numeric(12, 0), nullable=False)
    reason = Column(String(255), nullable=True)
    changed_by = Column(String(100), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    dish = relationship("Dish", back_populates="price_history")


class DailyMenu(Base):
    __tablename__ = "daily_menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_date = Column(Date, nullable=False, index=True)
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    dish = relationship("Dish", back_populates="daily_menus")