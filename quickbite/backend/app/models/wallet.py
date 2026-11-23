from sqlalchemy import Column, Integer, String, DECIMAL, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database.db import Base

class WalletModel(Base):
    __tablename__ = "Wallet"
    id = Column("Wallet_ID", Integer, primary_key=True, autoincrement=True, index=True)
    user_id = Column("User_ID", Integer, ForeignKey("users.user_id"), nullable=False, unique=True)
    balance = Column("Balance", DECIMAL(15, 2), nullable=False, default=0.00)
    status = Column("Status", String(20), nullable=False, default="ACTIVE")
    transactions = relationship("WalletTransactionModel", back_populates="wallet", cascade="all, delete-orphan")

class WalletTransactionModel(Base):
    __tablename__ = "Transaction"
    id = Column("Transaction_ID", Integer, primary_key=True, autoincrement=True, index=True)
    wallet_id = Column("Wallet_ID", Integer, ForeignKey("Wallet.Wallet_ID"), nullable=False)
    amount_money = Column("Amount", DECIMAL(15, 2), nullable=False)
    type_transaction = Column("Type_transaction", String(50), nullable=False)
    created_at = Column("Created_At", DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    wallet = relationship("WalletModel", back_populates="transactions")
