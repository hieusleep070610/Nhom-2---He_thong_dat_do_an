"""Transactional reservations for daily pickup slot serving capacity."""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.pickup_slot import PickupSlot, SlotDailyQuota

_LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def reserve_slot_servings(
    db: Session,
    pickup_slot_id: int,
    service_date: date,
    servings: int,
) -> SlotDailyQuota:
    """Lock capacity and reserve servings; caller commits with order creation.

    Lock the parent slot to serialize creation of a first daily quota row. On
    MySQL/InnoDB the row lock remains held until the order transaction ends.
    """
    if servings <= 0:
        raise BadRequestException(message="Số suất đặt phải lớn hơn 0.")
    if service_date < datetime.now(_LOCAL_TIMEZONE).date():
        raise BadRequestException(message="Ngày nhận món không hợp lệ.")

    slot = (
        db.query(PickupSlot)
        .filter(PickupSlot.id == pickup_slot_id)
        .with_for_update()
        .first()
    )
    if slot is None:
        raise NotFoundException(message="Khung giờ nhận món không tồn tại.")
    if not bool(slot.is_active):
        raise ConflictException(
            message="Khung giờ nhận món hiện không hoạt động.", code="SLOT_UNAVAILABLE"
        )

    now = datetime.now(_LOCAL_TIMEZONE)
    if service_date == now.date() and slot.end_time <= now.time().replace(tzinfo=None):
        raise ConflictException(
            message="Khung giờ nhận món đã qua.", code="SLOT_PAST"
        )

    quota = (
        db.query(SlotDailyQuota)
        .filter(
            SlotDailyQuota.pickup_slot_id == pickup_slot_id,
            SlotDailyQuota.service_date == service_date,
        )
        .with_for_update()
        .first()
    )
    if quota is None:
        quota = SlotDailyQuota(
            pickup_slot_id=pickup_slot_id,
            service_date=service_date,
            max_servings=int(slot.max_servings),
            booked_servings=0,
        )
        db.add(quota)
        db.flush()

    remaining = max(0, int(quota.max_servings) - int(quota.booked_servings))
    if servings > remaining:
        raise ConflictException(
            message="Khung giờ không còn đủ suất để nhận đơn.",
            code="SLOT_FULL",
            details={"remaining_servings": remaining, "requested_servings": servings},
        )

    quota.booked_servings = int(quota.booked_servings) + servings
    db.flush()
    return quota


def release_order_slot_servings(db: Session, order) -> None:
    """Release a cancelled order's reservation once, inside its status transaction."""
    quantity = sum(int(item.quantity) for item in order.items)
    if quantity <= 0:
        return

    quota = (
        db.query(SlotDailyQuota)
        .filter(
            SlotDailyQuota.pickup_slot_id == order.pickup_slot_id,
            SlotDailyQuota.service_date == order.pickup_date,
        )
        .with_for_update()
        .first()
    )
    # Older orders may predate daily quota tracking; do not invent a reservation.
    if quota is not None:
        quota.booked_servings = max(0, int(quota.booked_servings) - quantity)
        db.flush()
