from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException
from app.models.order import Order
from app.models.wallet import WalletModel, WalletTransactionModel


def payment_key(order_id: int) -> str:
    return f"payment:{order_id}"


def refund_key(order_id: int) -> str:
    return f"refund:{order_id}"


def refund_paid_order(db: Session, order_id: int) -> None:
    """Hoàn ví đúng một lần nếu đơn đã bị trừ tiền. Không hoàn khi chưa thu."""
    if (
        db.query(WalletTransactionModel)
        .filter(WalletTransactionModel.type_transaction == refund_key(order_id))
        .first()
    ):
        return

    payment = (
        db.query(WalletTransactionModel)
        .filter(WalletTransactionModel.type_transaction == payment_key(order_id))
        .first()
    )
    if payment is None:
        return

    wallet = (
        db.query(WalletModel)
        .filter(WalletModel.id == payment.wallet_id)
        .with_for_update()
        .first()
    )
    if wallet is None:
        raise ConflictException(
            message="Không tìm thấy ví đã thanh toán để hoàn tiền.",
            code="INVALID_ORDER_STATE",
        )

    amount = abs(Decimal(payment.amount_money))
    wallet.balance = Decimal(wallet.balance) + amount
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if order is not None:
        order.payment_status = "refunded"
    db.add(
        WalletTransactionModel(
            wallet_id=wallet.id,
            type_transaction=refund_key(order_id),
            amount_money=amount,
        )
    )
