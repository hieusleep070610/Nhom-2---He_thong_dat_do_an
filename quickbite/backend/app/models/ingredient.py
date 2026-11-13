from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from app.database.database import Base

class Ingredient(Base):
    __tablename__ = "Ingredient"
    
    Ingredient_ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Ingredient_Name = Column(String(100), nullable=False)
    Unit = Column(String(20), nullable=False)

class DishIngredient(Base):
    __tablename__ = "Dish_Ingredient"
    
    Dish_Ingredient_ID = Column(Integer, primary_key=True, index=True, autoincrement=True)
    Dish_ID = Column(Integer, ForeignKey("Dish.Dish_ID", ondelete="CASCADE"), nullable=False)
    Ingredient_ID = Column(Integer, ForeignKey("Ingredient.Ingredient_ID", ondelete="RESTRICT"), nullable=False)
    Quantity = Column(Numeric(10, 2), nullable=False)