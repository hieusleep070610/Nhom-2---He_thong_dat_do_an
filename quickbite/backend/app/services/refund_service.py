from __future__ import annotations

from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.order import Order
from app.models.user import User
from app.models.wallet import WalletModel, WalletTransactionModel


def payment_key(order_id: int) -> str:
    return f"payment:{order_id}"


def refund_key(order_id: int) -> str:
    return f"refund:{order_id}"


def _find_payment_tx(db: Session, order_id: int) -> WalletTransactionModel | None:
    return (
        db.query(WalletTransactionModel)
        .filter(WalletTransactionModel.type_transaction == payment_key(order_id))
        .order_by(WalletTransactionModel.id.desc())
        .first()
    )


def _find_refund_tx(db: Session, order_id: int) -> WalletTransactionModel | None:
    return (
        db.query(WalletTransactionModel)
        .filter(WalletTransactionModel.type_transaction == refund_key(order_id))
        .order_by(WalletTransactionModel.id.desc())
        .first()
    )


def get_refund_info(
    db: Session,
    *,
    order_id: int,
    actor: User,
    is_staff_or_admin: bool = False,
) -> dict:
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise NotFoundException(message="Không tìm thấy đơn hàng.")

    if not is_staff_or_admin and order.user_id != actor.user_id:
        raise BadRequestException(
            message="Bạn không có quyền xem thông tin hoàn tiền của đơn hàng này.",
            details={"code": "ORDER_FORBIDDEN"},
        )

    payment_tx = _find_payment_tx(db, order.id)
    refund_tx = _find_refund_tx(db, order.id)

    method = (order.payment_method or "").strip().lower()
    pay_status = (order.payment_status or "").strip().lower()
    order_status = (order.status or "").strip().lower()

    wallet_paid = bool(
        payment_tx is not None or (method == "wallet" and pay_status in {"paid", "refunded"})
    )

    if payment_tx is not None:
        max_amount = abs(Decimal(str(payment_tx.amount_money or 0)))
    elif wallet_paid:
        max_amount = Decimal(str(order.total_amount or 0))
    else:
        max_amount = Decimal("0")

    refund_payload = None
    if refund_tx is not None or pay_status == "refunded":
        refund_payload = {
            "code": refund_key(order.id),
            "status": "completed",
            "amount": float(
                abs(Decimal(str(refund_tx.amount_money or max_amount)))
                if refund_tx is not None
                else max_amount
            ),
        }

    is_cancelled_or_rejected = order_status in {"cancelled", "rejected"}
    already_refunded = refund_payload is not None
    can_request = bool(wallet_paid and is_cancelled_or_rejected and not already_refunded and max_amount > 0)

    return {
        "order_id": order.id,
        "order_code": order.code or str(order.id),
        "order_status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "wallet_paid": wallet_paid,
        "payment_txn_code": payment_key(order.id) if payment_tx is not None else None,
        "max_amount": float(max_amount),
        "can_request": can_request,
        "refund": refund_payload,
    }


def refund_paid_order(db: Session, order_id: int) -> Decimal:
    """
    Hoàn tiền vào ví đúng 1 lần nếu đơn đã thu tiền qua ví.
    Trả về số tiền đã hoàn (Decimal).
    """
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if order is None:
        return Decimal("0")

    current_pay_status = (order.payment_status or "").strip().lower()
    if current_pay_status == "refunded":
        return Decimal("0")

    r_key = refund_key(order_id)
    existing_refund = (
        db.query(WalletTransactionModel)
        .filter(WalletTransactionModel.type_transaction == r_key)
        .first()
    )
    if existing_refund is not None:
        order.payment_status = "refunded"
        db.flush()
        return Decimal("0")

    payment_tx = _find_payment_tx(db, order_id)
    wallet = None

    if payment_tx is not None:
        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.id == payment_tx.wallet_id)
            .with_for_update()
            .first()
        )
        amount = abs(Decimal(str(payment_tx.amount_money or 0)))
    else:
        method = (order.payment_method or "").strip().lower()
        if method != "wallet" or current_pay_status != "paid":
            return Decimal("0")
        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.user_id == order.user_id)
            .with_for_update()
            .first()
        )
        amount = Decimal(str(order.total_amount or 0))

    if wallet is None:
        raise ConflictException(
            message="Không tìm thấy ví của người dùng để hoàn tiền.",
            code="WALLET_NOT_FOUND",
        )

    if amount > 0:
        wallet.balance = Decimal(str(wallet.balance or 0)) + amount
        db.add(
            WalletTransactionModel(
                wallet_id=wallet.id,
                type_transaction=r_key,
                amount_money=amount,
            )
        )

    order.payment_status = "refunded"
    db.flush()
    return amount


def request_order_refund(
    db: Session,
    *,
    order_id: int,
    actor: User,
    reason: str,
    is_staff_or_admin: bool = False,
) -> dict:
    clean_reason = (reason or "").strip()
    if not clean_reason:
        raise BadRequestException(message="Vui lòng nhập lý do hoàn tiền.")

    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if order is None:
        raise NotFoundException(message="Không tìm thấy đơn hàng.")

    if not is_staff_or_admin and order.user_id != actor.user_id:
        raise BadRequestException(
            message="Bạn không có quyền yêu cầu hoàn tiền cho đơn hàng này.",
            details={"code": "ORDER_FORBIDDEN"},
        )

    order_status = (order.status or "").strip().lower()
    if order_status not in {"cancelled", "rejected"}:
        raise ConflictException(
            message="Chỉ hoàn tiền cho đơn đã hủy hoặc bị từ chối.",
            code="ORDER_NOT_CANCELLED_OR_REJECTED",
        )

    refunded = refund_paid_order(db, order.id)
    if refunded <= 0 and (order.payment_status or "").strip().lower() != "refunded":
        raise ConflictException(
            message="Đơn này không có khoản thanh toán qua ví để hoàn.",
            code="NOT_WALLET_PAID",
        )

    order.note = (
        f"{order.note} | Lý do hoàn tiền: {clean_reason}"
        if order.note
        else f"Lý do hoàn tiền: {clean_reason}"
    )

    db.commit()
    db.refresh(order)

    return {
        "status": "success",
        "order_id": order.id,
        "order_code": order.code,
        "payment_status": order.payment_status,
        "refunded_amount": float(refunded),
        "refund_code": refund_key(order.id),
    }