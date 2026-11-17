from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.order import Order
from app.models.user import User
from app.models.wallet import WalletModel, WalletTransactionModel
from app.schemas.wallet import WalletCreate
from app.services.refund_service import payment_key


def get_wallet_by_id(db: Session, wallet_id: int):
    return db.query(WalletModel).filter(WalletModel.id == wallet_id).first()


def get_wallet_by_user_id(db: Session, user_id: int):
    return db.query(WalletModel).filter(WalletModel.user_id == user_id).first()


def create_wallet(db: Session, wallet_in: WalletCreate):
    user_exists = db.query(User).filter(User.user_id == wallet_in.user_id).first()
    if not user_exists:
        raise NotFoundException(
            message=f"Không tìm thấy người dùng (User ID: {wallet_in.user_id}) trong hệ thống để tạo ví!"
        )

    existing_wallet = db.query(WalletModel).filter(WalletModel.user_id == wallet_in.user_id).first()
    if existing_wallet:
        raise BadRequestException(
            message=f"Người dùng với ID {wallet_in.user_id} đã sở hữu một ví rồi!"
        )

    db_wallet = WalletModel(
        user_id=wallet_in.user_id,
        balance=Decimal("0.00"),
        status="active",
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet


def update_wallet(db: Session, wallet_id: int, status: str = None):
    wallet = get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise NotFoundException(message="Không tìm thấy ví để cập nhật")

    if status is not None:
        wallet.status = status

    db.commit()
    db.refresh(wallet)
    return wallet


def _is_active(status: str | None) -> bool:
    return (status or "").strip().lower() == "active"


def process_payment(db: Session, wallet_id: int, order_id: int):
    """Trừ ví theo tổng tiền của đơn trong DB. Không dùng số tiền do client gửi."""
    try:
        order = (
            db.query(Order)
            .filter(Order.id == order_id)
            .with_for_update()
            .first()
        )
        if order is None:
            raise NotFoundException(message=f"Không tìm thấy đơn hàng có ID {order_id}")

        if (order.status or "").strip().lower() == "cancelled":
            raise ConflictException(
                message="Đơn đã hủy nên không thể thanh toán.",
                code="INVALID_ORDER_STATE",
            )

        amount = Decimal(order.total_amount)
        if amount <= 0:
            raise BadRequestException(message="Đơn hàng chưa có số tiền hợp lệ để thanh toán.")

        already_paid = (
            db.query(WalletTransactionModel)
            .filter(WalletTransactionModel.type_transaction == payment_key(order_id))
            .first()
        )
        if already_paid is not None:
            raise ConflictException(
                message="Đơn này đã được thanh toán. Không trừ ví lần hai.",
                code="DUPLICATE_PAYMENT",
            )

        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.id == wallet_id)
            .with_for_update()
            .first()
        )
        if not wallet:
            raise NotFoundException(message="Không tìm thấy ví điện tử.")

        if not _is_active(wallet.status):
            raise ConflictException(
                message="Ví điện tử đang bị khóa.",
                code="INVALID_ORDER_STATE",
            )

        if Decimal(wallet.balance) < amount:
            raise ConflictException(
                message=(
                    f"Số dư không đủ! Hiện có: {wallet.balance} , cần thanh toán: {amount}."
                ),
                code="INSUFFICIENT_BALANCE",
            )

        wallet.balance = Decimal(wallet.balance) - amount
        db.add(
            WalletTransactionModel(
                wallet_id=wallet.id,
                type_transaction=payment_key(order_id),
                amount_money=-amount,
            )
        )
        db.commit()
        db.refresh(wallet)
        return wallet
    except Exception:
        db.rollback()
        raise
