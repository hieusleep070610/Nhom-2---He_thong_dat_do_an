from datetime import date
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.order import Order
from app.models.pickup_slot import PickupSlot
from app.schemas.kitchen_order import (
    KitchenDecisionEnum,
    KitchenOrderDecisionRequest,
    KitchenOrderDecisionResponse,
    OrderStatusEnum,
)
from app.services.order_notification_service import create_order_status_notification
from app.services.order_service import update_order_status


def get_kitchen_orders(
    db: Session,
    pickup_date: date,
    pickup_slot_id: int | None = None,
    slot_label: str | None = None,
    order_status: OrderStatusEnum | None = None,
) -> list[Order]:
    query = (
        db.query(Order)
        .join(PickupSlot, Order.pickup_slot_id == PickupSlot.id)
        .options(
            joinedload(Order.items),
            joinedload(Order.pickup_slot),
        )
        .filter(Order.pickup_date == pickup_date)
    )

    if pickup_slot_id is not None:
        query = query.filter(Order.pickup_slot_id == pickup_slot_id)

    if slot_label:
        query = query.filter(PickupSlot.label == slot_label)

    if order_status is not None:
        query = query.filter(Order.status == order_status.value)

    return query.order_by(
        PickupSlot.start_time.asc(),
        Order.created_at.asc(),
        Order.id.asc(),
    ).all()


def _append_reject_note(existing_note: str | None, reason: str) -> str:
    prefix = f"[Bếp từ chối]: {reason}"
    if not existing_note:
        return prefix[:200]
    combined = f"{existing_note} | {prefix}"
    return combined[:200]


def decide_order(
    db: Session,
    order_id: int,
    payload: KitchenOrderDecisionRequest,
    changed_by: int | None = None,
) -> KitchenOrderDecisionResponse:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )

    if order is None:
        raise NotFoundException(message=f"Không tìm thấy đơn hàng có ID {order_id}")

    previous_status = OrderStatusEnum(order.status)
    if previous_status != OrderStatusEnum.PENDING:
        raise BadRequestException(
            message=(
                f"Chỉ có thể tiếp nhận hoặc từ chối đơn đang ở trạng thái 'pending' "
                f"(hiện tại: '{previous_status.value}')."
            ),
        )

    if payload.action == KitchenDecisionEnum.ACCEPT:
        updated_order = update_order_status(
            db=db,
            order_id=order_id,
            new_status=OrderStatusEnum.CONFIRMED.value,
            changed_by=changed_by,
        )
        create_order_status_notification(
            db=db,
            order=updated_order,
            old_status=previous_status.value,
            new_status=updated_order.status,
        )
        db.commit()
        message = f"Đã tiếp nhận đơn {updated_order.code}."

    elif payload.action == KitchenDecisionEnum.REJECT:
        clean_reason = (payload.reason or "").strip()
        if not clean_reason:
            raise BadRequestException(
                message="Vui lòng nhập lý do từ chối đơn.",
            )
        order.note = _append_reject_note(order.note, clean_reason)
        db.flush()
        updated_order = update_order_status(
            db=db,
            order_id=order_id,
            new_status=OrderStatusEnum.CANCELLED.value,
            changed_by=changed_by,
        )
        create_order_status_notification(
            db=db,
            order=updated_order,
            old_status=previous_status.value,
            new_status=updated_order.status,
        )
        db.commit()
        message = f"Đã từ chối đơn {updated_order.code}."

    db.refresh(updated_order)

    return KitchenOrderDecisionResponse(
        order_id=updated_order.id,
        code=updated_order.code,
        previous_status=previous_status,
        current_status=OrderStatusEnum(updated_order.status),
        note=updated_order.note,
        message=message,
    )