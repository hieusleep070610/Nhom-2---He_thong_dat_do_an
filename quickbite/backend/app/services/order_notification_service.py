from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.notification import OrderNotification
from app.models.order import Order

STATUS_LABELS_VI = {
    "pending": "Chờ xác nhận",
    "confirmed": "Đã xác nhận",
    "preparing": "Đang chuẩn bị",
    "ready": "Sẵn sàng giao / Đang giao",
    "completed": "Đã hoàn thành",
    "cancelled": "Đã hủy",
}


def build_status_notification_content(
    order: Order,
    old_status: str,
    new_status: str,
) -> tuple[str, str]:
    code_label = getattr(order, "code", None) or f"#{order.id}"
    new_label = STATUS_LABELS_VI.get(new_status, new_status)

    title = f"Đơn hàng {code_label}: {new_label}"
    if new_status == "cancelled":
        message = f"Đơn hàng {code_label} đã bị hủy."
    elif new_status == "completed":
        message = f"Đơn hàng {code_label} đã hoàn thành. Cảm ơn bạn đã đặt món!"
    else:
        old_label = STATUS_LABELS_VI.get(old_status, old_status)
        message = f"Đơn hàng {code_label} chuyển từ '{old_label}' sang '{new_label}'."

    return title, message


def create_order_status_notification(
    db: Session,
    order: Order,
    old_status: str,
    new_status: str,
) -> OrderNotification | None:
    if not order.user_id:
        return None

    title, message = build_status_notification_content(order, old_status, new_status)
    notification = OrderNotification(
        user_id=order.user_id,
        order_id=order.id,
        order_code=getattr(order, "code", None),
        old_status=old_status,
        new_status=new_status,
        title=title,
        message=message,
        is_read=False,
    )
    db.add(notification)
    return notification


def list_my_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    limit: int = 20,
):
    query = db.query(OrderNotification).filter(OrderNotification.user_id == user_id)
    if unread_only:
        query = query.filter(OrderNotification.is_read.is_(False))

    items = (
        query.order_by(OrderNotification.created_at.desc(), OrderNotification.id.desc())
        .limit(limit)
        .all()
    )
    unread_count = (
        db.query(OrderNotification)
        .filter(
            OrderNotification.user_id == user_id,
            OrderNotification.is_read.is_(False),
        )
        .count()
    )

    return {
        "unread_count": unread_count,
        "items": items,
    }


def mark_notification_as_read(
    db: Session,
    user_id: int,
    notification_id: int,
) -> OrderNotification:
    notif = (
        db.query(OrderNotification)
        .filter(
            OrderNotification.id == notification_id,
            OrderNotification.user_id == user_id,
        )
        .first()
    )
    if notif is None:
        raise NotFoundException(message="Không tìm thấy thông báo")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_notifications_as_read(db: Session, user_id: int) -> int:
    updated = (
        db.query(OrderNotification)
        .filter(
            OrderNotification.user_id == user_id,
            OrderNotification.is_read.is_(False),
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated