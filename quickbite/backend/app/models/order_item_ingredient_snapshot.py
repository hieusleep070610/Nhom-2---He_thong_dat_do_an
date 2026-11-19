from sqlalchemy import BigInteger, Column, ForeignKey, Integer, Numeric, String

from app.database.db import Base


class OrderItemIngredientSnapshot(Base):
    __tablename__ = "order_item_ingredient_snapshots"

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    order_item_id = Column(BigInteger, ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("Ingredient.Ingredient_ID", ondelete="SET NULL"), nullable=True)
    ingredient_name = Column(String(100), nullable=False)
    unit = Column(String(20), nullable=False)
    quantity_per_serving = Column(Numeric(15, 3), nullable=False)
    required_quantity = Column(Numeric(15, 3), nullable=False)
