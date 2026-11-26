from sqlalchemy.orm import Session, joinedload

from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.models.pickup_slot import PickupSlot
from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.services.refund_service import refund_paid_order
from app.services.pickup_slot_quota_service import release_order_slot_servings
from app.services.ingredient_stock_service import restore_order_ingredient_stock
from datetime import date
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

def list_filtered_orders(
    db: Session,
    current_user,
    has_role_fn,
    pickup_date: date | None = None,
    status: str | None = None,
    pickup_slot_id: int | None = None,
    slot_label: str | None = None,
    page: int = 1,
    limit: int = 10,
):
    query = db.query(Order).options(
        joinedload(Order.items),
        joinedload(Order.pickup_slot),
    )

    if has_role_fn(current_user, "admin"):
        pass
    elif has_role_fn(current_user, "kitchen"):
        query = query.filter(Order.status.in_(["confirmed", "preparing", "ready"]))
    elif has_role_fn(current_user, "customer"):
        query = query.filter(Order.user_id == current_user.user_id)
    else:
        return {
            "total": 0,
            "page": page,
            "limit": limit,
            "items": [],
        }

    if pickup_date is not None:
        query = query.filter(Order.pickup_date == pickup_date)

    if status is not None and status.strip() != "":
        normalized_status = status.strip().lower()
        if normalized_status not in VALID_ORDER_STATUSES:
            raise BadRequestException(
                message=f"Trạng thái không hợp lệ: {status}"
            )
        query = query.filter(Order.status == normalized_status)

    if pickup_slot_id is not None:
        query = query.filter(Order.pickup_slot_id == pickup_slot_id)

    if slot_label is not None and slot_label.strip() != "":
        query = query.join(PickupSlot).filter(
            PickupSlot.label == slot_label.strip()
        )

    total = query.count()
    offset = (page - 1) * limit
    rows = (
        query.order_by(Order.created_at.desc(), Order.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [
        {
            "id": row.id,
            "code": row.code,
            "customer_name": row.customer_name,
            "status": row.status,
            "pickup_date": row.pickup_date,
            "pickup_slot_id": row.pickup_slot_id,
            "slot_label": row.pickup_slot.label if row.pickup_slot else None,
            "total_amount": float(row.total_amount),
            "created_at": row.created_at,
            "payment_method": row.payment_method,
            "payment_status": row.payment_status,
            "title": row.items[0].item_name if row.items else f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items,
    }