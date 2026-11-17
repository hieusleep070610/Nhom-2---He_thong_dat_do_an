from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    price = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)

    daily_menus = relationship("DailyMenu", back_populates="dish", cascade="all, delete-orphan")


class DailyMenu(Base):
    __tablename__ = "daily_menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_date = Column(Date, nullable=False, index=True)  
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1) 

    dish = relationship("Dish", back_populates="daily_menus")