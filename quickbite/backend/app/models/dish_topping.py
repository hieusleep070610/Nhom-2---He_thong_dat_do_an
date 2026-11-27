from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, UniqueConstraint

from app.database.db import Base


class DishTopping(Base):
    __tablename__ = "dish_toppings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dish_id = Column(Integer, ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    price = Column(Numeric(12, 0), nullable=False, default=0)
    __table_args__ = (UniqueConstraint("dish_id", "name", name="uq_dish_topping_name"),)
