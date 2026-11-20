from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database.db import Base

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False, unique=True, index=True)
    price = Column(Numeric(12, 0), nullable=False)
    description = Column(String(255), nullable=True)
    is_available = Column(Boolean, default=True)
    image_url = Column(String(1000), nullable=True)
    image_public_id = Column(String(255), nullable=True)
    category_id = Column(Integer, ForeignKey("dish_categories.id"), nullable=True)

    daily_menus = relationship("DailyMenu", back_populates="dish", cascade="all, delete-orphan")
    category = relationship("DishCategory", back_populates="dishes")

    @property
    def category_name(self):
        return self.category.name if self.category else None


class DailyMenu(Base):
    __tablename__ = "daily_menus"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    menu_date = Column(Date, nullable=False, index=True)  
    dish_id = Column(Integer, ForeignKey("dishes.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1) 

    dish = relationship("Dish", back_populates="daily_menus")
