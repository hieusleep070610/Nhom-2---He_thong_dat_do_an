from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, func
from app.database.db import Base

class Order(Base):
    __tablename__ = "Order"
    order_id = Column("Order_ID", Integer, primary_key=True, autoincrement=True)
    total_price = Column("Total_Price", Numeric(12, 2), nullable=False, default=0.00)
    fee = Column("Fee", Numeric(12, 2), nullable=False, default=0.00)
    order_status = Column("Order_status", String(30), nullable=False, default="PENDING", server_default="PENDING")
    payment = Column("Payment", String(50), nullable=True, default="CASH", server_default="CASH")
    created_at = Column("Created_At", DateTime, server_default=func.current_timestamp())

    user_id = Column("UserID", Integer, ForeignKey("User.User_ID"), nullable=False)