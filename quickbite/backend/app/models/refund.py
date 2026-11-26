from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id"))
    wallet_id: Mapped[int] = mapped_column(ForeignKey("Wallet.Wallet_ID"))
    payment_txn_id: Mapped[int | None] = mapped_column(ForeignKey("Transaction.Transaction_ID"))
    refund_txn_id: Mapped[int | None] = mapped_column(ForeignKey("Transaction.Transaction_ID"))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2))
    reason: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(Enum("pending", "completed", "rejected", name="refund_status"),
                                        default="pending", server_default="pending")
    note: Mapped[str | None] = mapped_column(String(255))
    requested_by: Mapped[str | None] = mapped_column(String(100))
    requested_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)