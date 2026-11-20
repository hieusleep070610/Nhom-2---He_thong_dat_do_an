from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestException, NotFoundException
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
    if db.query(WalletModel).filter(WalletModel.user_id == wallet_in.user_id).first():
        raise BadRequestException(message=f"Người dùng {wallet_in.user_id} đã có ví rồi!")

    db_wallet = WalletModel(
        user_id=wallet_in.user_id,
        balance=Decimal("0.00"),
        status="ACTIVE",
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet


def update_wallet(db: Session, wallet_id: int, status: str = None):
    wallet = get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise NotFoundException(message="Không tìm thấy ví")

    if status:
        wallet.status = status
    db.commit()
    db.refresh(wallet)
    return wallet


def process_payment(db: Session, wallet_id: int, order_id: int):
    try:
        order = (
            db.query(Order)
            .filter(Order.id == order_id)
            .with_for_update()
            .first()
        )
        if not order:
            raise NotFoundException(message=f"Không tìm thấy đơn hàng ID {order_id}")

        if order.status == "cancelled":
            raise BadRequestException(message="Đơn hàng đã bị hủy, không thể thanh toán.")
        if order.status not in {"pending", "confirmed"}:
            raise BadRequestException(message="Đơn hàng đã chuyển sang chế biến, không thể thanh toán.")
        if order.payment_status == "paid":
            raise BadRequestException(message="Đơn hàng này đã được thanh toán trước đó.")

        amount = Decimal(order.total_amount)
        already_paid = (
            db.query(WalletTransactionModel)
            .filter(WalletTransactionModel.type_transaction == payment_key(order_id))
            .first()
        )
        if already_paid:
            raise BadRequestException(message="Đơn hàng này đã được thanh toán trước đó.")

        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.id == wallet_id)
            .with_for_update()
            .first()
        )
        if not wallet:
            raise NotFoundException(message="Không tìm thấy ví điện tử.")
        if wallet.user_id != order.user_id:
            raise BadRequestException(message="Ví không thuộc về khách hàng của đơn hàng.")
        if (wallet.status or "").strip().casefold() != "active":
            raise BadRequestException(message="Ví điện tử hiện không hoạt động.")

        if wallet.balance < amount:
            raise BadRequestException(message=f"Số dư không đủ! Cần {amount}, hiện có {wallet.balance}.")

        wallet.balance = Decimal(wallet.balance) - amount
        order.payment_method = "wallet"
        order.payment_status = "paid"
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
