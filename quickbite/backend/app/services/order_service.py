from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.core.exceptions import BadRequestException, NotFoundException

ORDER_STATUS_TRANSITIONS = {
    "PENDING": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["PREPARING", "CANCELLED"],
    "PREPARING": ["SHIPPING"],
    "SHIPPING": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": []
}


def update_order_status(
    db: Session,
    order_id: int,
    new_status: str,
    changed_by: int | None = None
):
    new_status = new_status.strip().upper()

    if new_status not in ORDER_STATUS_TRANSITIONS:
        raise BadRequestException(
            message=f"Trạng thái không hợp lệ: {new_status}"
        )

    try:
        order = (
            db.query(Order)
            .filter(Order.order_id == order_id)
            .with_for_update()
            .first()
        )
        if order is None:
            raise NotFoundException(
                message=f"Không tìm thấy đơn hàng có ID {order_id}"
            )

        old_status = order.order_status.strip().upper()

        allowed_statuses = ORDER_STATUS_TRANSITIONS.get(old_status, [])

        if new_status not in allowed_statuses:
            raise BadRequestException(
                message=(
                    f"Không thể chuyển trạng thái từ "
                    f"{old_status} sang {new_status}"
                )
            )

        order.order_status = new_status

        history = OrderStatusHistory(
            order_id=order_id,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by
        )

        db.add(history)

        db.commit()
        db.refresh(order)

        return order

    except Exception:
        db.rollback()
        raise