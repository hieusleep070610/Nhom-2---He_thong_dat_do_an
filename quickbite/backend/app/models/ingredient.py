from sqlalchemy import CheckConstraint, Column, Integer, String, Numeric, ForeignKey, Boolean
from app.database.db import Base

class Ingredient(Base):
    __tablename__ = "Ingredient"
    
    Ingredient_ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Ingredient_Name = Column(String(100), nullable=False, unique=True)
    Unit = Column(String(20), nullable=False)
    min_stock = Column(Numeric(15, 3), nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)

class DishIngredient(Base):
    __tablename__ = "Dish_Ingredient"
    
    Dish_Ingredient_ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Dish_ID = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    Ingredient_ID = Column(Integer, ForeignKey("Ingredient.Ingredient_ID", ondelete="RESTRICT"), nullable=False)
    Quantity = Column(Numeric(15, 3), nullable=False)

    __table_args__ = (
        CheckConstraint("Quantity > 0", name="chk_dish_ingredient_qty"),
    )