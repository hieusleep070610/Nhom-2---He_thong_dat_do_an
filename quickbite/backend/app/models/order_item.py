from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from app.database.db import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    order_id = Column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_code = Column(String(40), nullable=False)
    item_name = Column(String(120), nullable=False)
    unit_price = Column(Numeric(12, 0), nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Numeric(12, 0), nullable=False)

    order = relationship("Order", back_populates="items")

    __table_args__ = (
        CheckConstraint("unit_price > 0", name="chk_order_items_price"),
        CheckConstraint("quantity BETWEEN 1 AND 10", name="chk_order_items_qty"),
        CheckConstraint(
            "line_total = unit_price * quantity",
            name="chk_order_items_line_total",
        ),
    )
