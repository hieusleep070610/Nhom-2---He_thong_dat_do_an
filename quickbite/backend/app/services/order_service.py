from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.services.refund_service import refund_paid_order
from app.services.pickup_slot_quota_service import release_order_slot_servings
from app.services.ingredient_stock_service import restore_order_ingredient_stock
from sqlalchemy.orm import joinedload
ORDER_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready"],
    "ready": ["completed"],
    "completed": [],
    "cancelled": [],
}

LOCKED_CANCEL_STATUSES = {"preparing", "ready", "completed"}
VALID_ORDER_STATUSES = set(ORDER_STATUS_TRANSITIONS.keys())


def update_order_status(
    db: Session,
    order_id: int,
    new_status: str,
    changed_by: int | None = None,
):
    new_status = new_status.strip().lower()

    if new_status not in ORDER_STATUS_TRANSITIONS:
        raise BadRequestException(
            message=f"Trạng thái không hợp lệ: {new_status}"
        )

    try:
        order = (
            db.query(Order)
            .filter(Order.id == order_id)
            .with_for_update()
            .first()
        )
        if order is None:
            raise NotFoundException(
                message=f"Không tìm thấy đơn hàng có ID {order_id}"
            )

        old_status = (order.status or "").strip().lower()

        if new_status == "cancelled" and old_status == "cancelled":
            db.rollback()
            return order

        if new_status == "cancelled" and old_status in LOCKED_CANCEL_STATUSES:
            raise ConflictException(
                message=(
                    "Đơn đã sang giai đoạn chế biến nên không thể tự hủy. "
                    "Vui lòng liên hệ nhân viên."
                ),
                code="INVALID_ORDER_STATE",
            )

        allowed_statuses = ORDER_STATUS_TRANSITIONS.get(old_status, [])

        if new_status not in allowed_statuses:
            raise ConflictException(
                message=(
                    f"Không thể chuyển trạng thái từ "
                    f"{old_status} sang {new_status}"
                ),
                code="INVALID_ORDER_STATE",
            )

        if new_status == "cancelled":
            release_order_slot_servings(db, order)
            restore_order_ingredient_stock(db, order_id)
            refund_paid_order(db, order_id)

        order.status = new_status

        history = OrderStatusHistory(
            order_id=order_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=None if changed_by is None else str(changed_by),
        )

        db.add(history)

        db.commit()
        db.refresh(order)

        return order

    except Exception:
        db.rollback()
        raise

def list_my_orders(
    db: Session,
    user_id: int,
    status: str | None = None,
    page: int = 1,
    limit: int = 10,
):
    query = db.query(Order).filter(Order.user_id == user_id)

    if status is not None and status.strip() != "":
        normalized_status = status.strip().lower()
        if normalized_status not in VALID_ORDER_STATUSES:
            raise BadRequestException(
                message=f"Trạng thái không hợp lệ: {status}"
            )
        query = query.filter(Order.status == normalized_status)

    total = query.count()
    offset = (page - 1) * limit
    orders = (
        query.order_by(Order.created_at.desc(), Order.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": orders,
    }


def get_my_order_detail(
    db: Session,
    user_id: int,
    order_id: int,
):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(
            Order.id == order_id,
            Order.user_id == user_id,
        )
        .first()
    )

    if order is None:
        raise NotFoundException(
            message=f"Không tìm thấy đơn hàng có ID {order_id}"
        )

    return order