from sqlalchemy import BigInteger, Column, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database.db import Base

class WalletModel(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    balance = Column(BigInteger, nullable=False, default=0)
    xu = Column(BigInteger, nullable=False, default=0)
    status = Column(String(30), nullable=False, default="active")
    transactions = relationship("WalletTransactionModel", back_populates="wallet")

class WalletTransactionModel(Base):
    __tablename__ = "wallet_transactions"
    transactions_id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    type_transaction = Column(String(20), nullable=False)
    amount_money = Column(Integer, nullable=False)
    wallet = relationship("WalletModel", back_populates="transactions")