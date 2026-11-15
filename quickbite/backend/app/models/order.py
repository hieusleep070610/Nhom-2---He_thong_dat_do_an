from sqlalchemy import Column,Integer,String,Numeric,DateTime,ForeignKey,CheckConstraint,func
from app.database.db import Base

class Order(Base):
    __tablename__ = "orders"
    order_id = Column(Integer, primary_key= True, autoincrement= True)
    total_price = Column(Numeric(12,2), nullable= False,default= 0.00)
    fee = Column(Numeric(12,2), nullable= False,default= 0.00)
    order_status = Column(String(30), nullable= False, default= "PENDING", server_default="PENDING")
    payment = Column(String(50), nullable= True, default= "CASH", server_default="CASH")
    created_at = Column(DateTime,server_default=func.current_timestamp())
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete= "CASCADE", onupdate="CASCADE"), nullable= False)
