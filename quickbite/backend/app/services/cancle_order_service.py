from __future__ import annotations

from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.ingredient import Ingredient
from app.models.order import Order
from app.models.order_item_ingredient_snapshot import OrderItemIngredientSnapshot
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.models.wallet import WalletModel, WalletTransactionModel
from app.services.pickup_slot_quota_service import release_order_slot_servings
from app.services.refund_service import refund_key

CANCELLABLE_STATUSES = {"pending", "confirmed"}


def cancel_order(
    db: Session,
    *,
    order_id: int,
    actor: User,
    reason: str | None = None,
    is_staff_or_admin: bool = False,
) -> dict:
    order = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if order is None:
        raise NotFoundException(message="Không tìm thấy đơn hàng.")

    if not is_staff_or_admin and order.user_id != actor.user_id:
        raise BadRequestException(
            message="Bạn không có quyền hủy đơn hàng này.",
            details={"code": "ORDER_FORBIDDEN"},
        )

    current_status = (order.status or "").strip().lower()
    if current_status == "cancelled":
        return _cancel_response(order, refunded_amount=Decimal("0"))

    if current_status not in CANCELLABLE_STATUSES:
        raise ConflictException(
            message="Chỉ có thể hủy đơn hàng khi chưa chế biến.",
            code="ORDER_ALREADY_IN_PREPARATION",
            details={"order_id": order.id, "current_status": order.status},
        )

    try:
        old_status = order.status
        if order.pickup_slot_id and order.pickup_date:
            release_order_slot_servings(db, order)

        _restore_ingredients_from_snapshots(db, [item.id for item in (order.items or [])])
        refunded = _refund_wallet_if_needed(db, order)

        order.status = "cancelled"
        if reason and reason.strip():
            clean_reason = reason.strip()
            order.note = f"{order.note} | Lý do hủy: {clean_reason}" if order.note else f"Lý do hủy: {clean_reason}"

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                old_status=old_status,
                new_status="cancelled",
                changed_by=str(actor.user_id),
            )
        )

        db.commit()
        db.refresh(order)
        return _cancel_response(order, refunded_amount=refunded)
    except IntegrityError as exc:
        db.rollback()
        raise ConflictException(
            message="Không thể hủy đơn do xung đột dữ liệu.",
            code="CANCEL_ORDER_CONFLICT",
        ) from exc
    except Exception:
        db.rollback()
        raise


def _refund_wallet_if_needed(db: Session, order: Order) -> Decimal:
    if (order.payment_method or "").lower() != "wallet" or (order.payment_status or "").lower() != "paid":
        return Decimal("0")

    refunded = Decimal(order.total_amount or 0)
    if refunded > 0:
        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.user_id == order.user_id)
            .with_for_update()
            .first()
        )
        if wallet is None:
            raise ConflictException(
                message="Không tìm thấy ví để hoàn tiền đơn hàng.",
                code="WALLET_NOT_FOUND",
            )
        tx_key = refund_key(order.id)
        existed = (
            db.query(WalletTransactionModel)
            .filter(
                WalletTransactionModel.wallet_id == wallet.id,
                WalletTransactionModel.type_transaction == tx_key,
            )
            .first()
        )
        if existed is None:
            wallet.balance = Decimal(wallet.balance) + refunded
            db.add(
                WalletTransactionModel(
                    wallet_id=wallet.id,
                    type_transaction=tx_key,
                    amount_money=refunded,
                )
            )
    order.payment_status = "refunded"
    return refunded


def _restore_ingredients_from_snapshots(db: Session, order_item_ids: list[int]) -> None:
    if not order_item_ids:
        return
    snapshots = (
        db.query(OrderItemIngredientSnapshot)
        .filter(OrderItemIngredientSnapshot.order_item_id.in_(order_item_ids))
        .all()
    )
    totals_by_ing: dict[int, Decimal] = {}
    for snap in snapshots:
        qty = Decimal(str(snap.required_quantity or 0))
        if snap.ingredient_id and qty > 0:
            totals_by_ing[snap.ingredient_id] = totals_by_ing.get(snap.ingredient_id, Decimal("0")) + qty

    if not totals_by_ing:
        return

    ingredients = (
        db.query(Ingredient)
        .filter(Ingredient.Ingredient_ID.in_(sorted(totals_by_ing)))
        .order_by(Ingredient.Ingredient_ID)
        .with_for_update()
        .all()
    )
    for ing in ingredients:
        if ing.stock_quantity is not None:
            ing.stock_quantity = Decimal(ing.stock_quantity) + totals_by_ing[ing.Ingredient_ID]


def _cancel_response(order: Order, *, refunded_amount: Decimal) -> dict:
    return {
        "order_id": order.id,
        "order_code": order.code,
        "status": order.status,
        "payment_status": order.payment_status,
        "refunded_amount": refunded_amount,
        "pickup_date": order.pickup_date,
        "pickup_slot_id": order.pickup_slot_id,
    }