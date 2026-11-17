from sqlalchemy import Column, Integer, String, Text, Numeric, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

# Import Base từ file database.py vừa tạo ở trên
from app.db.database import Base

class Dish(Base):
    """1. Bảng danh mục món ăn (dishes)"""
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    default_price = Column(Numeric(10, 2), nullable=False, default=0.0)
    image_url = Column(String(500), nullable=True)
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    menu_items = relationship("MenuItem", back_populates="dish")


class Menu(Base):
    """2. Bảng thực đơn theo ngày (menus)"""
    __tablename__ = "menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_date = Column(Date, nullable=False, index=True)  # Ngày áp dụng
    meal_session = Column(String(50), default="lunch")    # Buổi sáng/trưa/tối
    status = Column(String(50), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    menu_items = relationship("MenuItem", back_populates="menu", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("menu_date", "meal_session", name="uk_date_session"),
    )


class MenuItem(Base):
    """3. Bảng chi tiết thực đơn: Món, Giá, Số suất theo ngày (menu_items)"""
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_id = Column(Integer, ForeignKey("menus.id", ondelete="CASCADE"), nullable=False)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="RESTRICT"), nullable=False)
    
    price = Column(Numeric(10, 2), nullable=False)                      # Giá theo ngày
    total_quantity = Column(Integer, nullable=False, default=0)         # Số suất chuẩn bị theo ngày
    remaining_quantity = Column(Integer, nullable=False, default=0)     # Số suất còn lại
    created_at = Column(DateTime, default=datetime.utcnow)

    menu = relationship("Menu", back_populates="menu_items")
    dish = relationship("Dish", back_populates="menu_items")

    __table_args__ = (
        UniqueConstraint("menu_id", "dish_id", name="uk_menu_dish"),
    )