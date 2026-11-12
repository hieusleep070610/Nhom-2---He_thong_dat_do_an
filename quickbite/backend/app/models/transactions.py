from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey
from app.database.db import Base

class Transaction(Base):
    __tablename__ = "transactions"

    transactions_id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    type_transaction = Column(String(20), nullable=False)
    amount_money = Column(BigInteger, nullable=False)