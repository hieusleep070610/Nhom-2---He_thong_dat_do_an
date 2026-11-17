from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.core.exceptions import BadRequestException, NotFoundException

ORDER_STATUS_TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready"],
    "ready": ["completed"],
    "completed": [],
    "cancelled": [],
}


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

        old_status = order.status.strip().lower()

        allowed_statuses = ORDER_STATUS_TRANSITIONS.get(old_status, [])

        if new_status not in allowed_statuses:
            raise BadRequestException(
                message=(
                    f"Không thể chuyển trạng thái từ "
                    f"{old_status} sang {new_status}"
                )
            )

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
