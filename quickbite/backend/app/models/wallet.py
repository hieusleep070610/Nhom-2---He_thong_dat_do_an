from sqlalchemy import Column, BigInteger, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database.db import Base

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, unique=True, nullable=False)
    balance = Column(BigInteger, nullable=False, default=0)
    xu = Column(BigInteger, nullable=False, default=0)
    status = Column(String(30), nullable=False, default='active')