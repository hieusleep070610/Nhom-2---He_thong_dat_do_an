
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func

from app.database.db import Base


class OrderStatusHistory(Base):
    __tablename__ = "Order_Status_History"

    history_id = Column(Integer,primary_key=True,autoincrement=True)
    order_id = Column(Integer,ForeignKey("orders.order_id", ondelete="CASCADE"),nullable=False)
    old_status = Column(String(30),nullable=True)
    new_status = Column(String(30),nullable=False)
    changed_at = Column(DateTime,server_default=func.current_timestamp())
    changed_by = Column(String(100),nullable=True)