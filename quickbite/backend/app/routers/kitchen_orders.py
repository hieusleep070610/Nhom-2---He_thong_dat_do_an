from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.db import get_db
from app.routers.auth import get_current_user
from app.schemas.kitchen_order import (
    KitchenOrderDecisionRequest,
    KitchenOrderDecisionResponse,
    KitchenOrderResponse,
    OrderStatusEnum,
)
from app.services.kitchen_order_service import decide_order, get_kitchen_orders

router = APIRouter(
    prefix="/kitchen/orders",
    tags=["Kitchen Orders"],
)


def _require_kitchen_or_admin(current_user) -> None:
    if current_user.user_id not in settings.admin_user_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập chức năng nhà bếp.",
        )


@router.get("", response_model=list[KitchenOrderResponse])
def list_orders_by_date_and_slot(
    pickup_date: date = Query(..., description="Ngày nhận đơn (YYYY-MM-DD)"),
    pickup_slot_id: int | None = Query(default=None, description="ID khung giờ nhận"),
    slot_label: str | None = Query(default=None, description="Nhãn khung giờ, vd: 11:00"),
    order_status: OrderStatusEnum | None = Query(
        default=None, alias="status", description="Lọc theo trạng thái"
    ),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_kitchen_or_admin(current_user)
    return get_kitchen_orders(
        db=db,
        pickup_date=pickup_date,
        pickup_slot_id=pickup_slot_id,
        slot_label=slot_label,
        order_status=order_status,
    )


@router.patch("/{order_id}/decision", response_model=KitchenOrderDecisionResponse)
def accept_or_reject_order(
    order_id: int,
    payload: KitchenOrderDecisionRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_kitchen_or_admin(current_user)
    return decide_order(
        db=db,
        order_id=order_id,
        payload=payload,
        changed_by=current_user.user_id,
    )