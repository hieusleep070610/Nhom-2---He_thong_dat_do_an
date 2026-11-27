from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import NotFoundException
from datetime import date
from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.routers.auth import (
    get_current_customer,
    get_current_user,
    has_role,
)
from app.schemas.order import (
    CreatedOrderResponse,
    OrderCreate,
    OrderDetailResponse,
    OrderStatusUpdate,
    PaginatedOrderResponse,
)
from app.services import order_service
from app.services.cancel_order_service import cancel_order, reject_order
from app.services.create_order_service import create_order
from app.services.order_service import update_order_status
from app.services.refund_service import get_refund_info, request_order_refund

router = APIRouter(tags=["Orders"], prefix="/orders")


class OrderActionReasonRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


def _is_staff_or_admin(user: User) -> bool:
    if has_role(user, "admin", "staff", "kitchen"):
        return True
    roles = getattr(user, "roles", None) or []
    return any(
        str(getattr(r, "name", r)).strip().lower() in {"admin", "staff", "kitchen"}
        for r in roles
    )


@router.get("/me", response_model=PaginatedOrderResponse)
def get_my_orders(
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.list_my_orders(
        db=db,
        user_id=current_user.user_id,
        status=status,
        page=page,
        limit=limit,
    )


@router.get("/me/{order_id}", response_model=OrderDetailResponse)
def get_my_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return order_service.get_my_order_detail(
        db=db,
        user_id=current_user.user_id,
        order_id=order_id,
    )


@router.post("", response_model=CreatedOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order_endpoint(
    request: OrderCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=100),
    customer: User = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    return create_order(
        db,
        customer=customer,
        pickup_date=request.pickup_date,
        pickup_slot_id=request.pickup_slot_id,
        items=[(item.dish_id, item.quantity, item.toppings, item.size) for item in request.items],
        note=request.note,
        payment_method=request.payment_method,
        delivery_address=request.delivery_address,
        coupon_code=request.coupon_code,
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
    )


@router.get("/mine")
def list_my_orders(
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.user_id == customer.user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "code": row.code,
            "status": row.status,
            "payment_status": row.payment_status,
            "total_amount": row.total_amount,
            "pickup_date": row.pickup_date,
            "pickup_slot_id": row.pickup_slot_id,
            "title": ", ".join(item.item_name for item in row.items)
            or f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]


@router.get("")
def list_orders(customer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Order).options(selectinload(Order.items))
    if has_role(customer, "admin"):
        pass
    elif has_role(customer, "kitchen"):
        query = query.filter(Order.status.in_(["confirmed", "preparing", "ready"]))
    elif has_role(customer, "customer"):
        query = query.filter(Order.user_id == customer.user_id)
    else:
        raise HTTPException(status_code=403, detail="Tài khoản chưa được gán vai trò.")
    rows = query.order_by(Order.created_at.desc()).all()

    return [
        {
            "id": row.id,
            "code": row.code,
            "customer_name": row.customer_name,
            "status": row.status,
            "total_amount": float(row.total_amount),
            "created_at": row.created_at,
            "pickup_date": getattr(row, "pickup_date", None),
            "pickup_slot_id": getattr(row, "pickup_slot_id", None),
            "payment_method": row.payment_method,
            "payment_status": row.payment_status,
            "title": row.items[0].item_name if row.items else f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]


@router.patch("/{order_id}/status")
def change_order_status(
    order_id: int,
    request: OrderStatusUpdate,
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None:
        raise NotFoundException(message=f"Không tìm thấy đơn hàng có ID {order_id}")

    is_owner = order.user_id == customer.user_id
    is_admin = has_role(customer, "admin")
    is_kitchen = has_role(customer, "kitchen")
    new_status = request.new_status.strip().lower()

    if is_admin:
        pass
    elif is_kitchen:
        if new_status not in {"preparing", "ready", "completed"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nhân viên bếp chỉ được chuyển trạng thái trong quy trình chế biến/nhận đơn.",
            )
    elif has_role(customer, "customer") and is_owner and new_status == "cancelled":
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền cập nhật trạng thái đơn hàng này.",
        )

    updated_order = update_order_status(
        db=db,
        order_id=order_id,
        new_status=new_status,
        changed_by=customer.user_id,
    )

    return {
        "status": "success",
        "message": "Cập nhật trạng thái đơn hàng thành công",
        "data": {
            "order_id": updated_order.id,
            "order_status": updated_order.status,
        },
    }
@router.get("/{order_id}/status-history")
def get_order_status_history(
    order_id: int,
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if order is None or (
        order.user_id != customer.user_id
        and not has_role(customer, "admin", "kitchen")
    ):
        raise NotFoundException(message=f"Không tìm thấy đơn hàng có ID {order_id}")

    histories = (
        db.query(OrderStatusHistory)
        .filter(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.history_id.asc())
        .all()
    )

    return {
        "status": "success",
        "data": [
            {
                "history_id": item.history_id,
                "order_id": item.order_id,
                "old_status": item.old_status,
                "new_status": item.new_status,
                "changed_at": item.changed_at,
                "changed_by": item.changed_by,
            }
            for item in histories
        ],
    }


@router.post("/{order_id}/cancel")
def api_cancel_order(
    order_id: int,
    payload: OrderActionReasonRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return cancel_order(
        db,
        order_id=order_id,
        actor=current_user,
        reason=payload.reason if payload else None,
        is_staff_or_admin=_is_staff_or_admin(current_user),
    )


@router.post("/{order_id}/reject")
def api_reject_order(
    order_id: int,
    payload: OrderActionReasonRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return reject_order(
        db,
        order_id=order_id,
        actor=current_user,
        reason=payload.reason if payload else None,
        is_staff_or_admin=_is_staff_or_admin(current_user),
    )

class RefundRequestBody(BaseModel):
    reason: str = Field(..., min_length=1, max_length=255)


@router.get("/{order_id}/refund-info")
def api_get_order_refund_info(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_refund_info(
        db,
        order_id=order_id,
        actor=current_user,
        is_staff_or_admin=_is_staff_or_admin(current_user),
    )


@router.post("/{order_id}/refund")
def api_request_order_refund(
    order_id: int,
    payload: RefundRequestBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return request_order_refund(
        db,
        order_id=order_id,
        actor=current_user,
        reason=payload.reason,
        is_staff_or_admin=_is_staff_or_admin(current_user),
    )
@router.get("/filter")
def filter_orders(
    pickup_date: date | None = Query(default=None, description="Lọc theo ngày nhận (YYYY-MM-DD)"),
    status: str | None = Query(default=None, description="Lọc theo trạng thái đơn hàng"),
    pickup_slot_id: int | None = Query(default=None, ge=1, description="Lọc theo ID khung giờ nhận"),
    slot_label: str | None = Query(default=None, description="Lọc theo nhãn khung giờ, vd: 11:00"),
    page: int = Query(default=1, ge=1, description="Trang hiện tại"),
    limit: int = Query(default=10, ge=1, le=100, description="Số bản ghi mỗi trang"),
    customer=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (
        has_role(customer, "admin")
        or has_role(customer, "kitchen")
        or has_role(customer, "customer")
    ):
        raise HTTPException(status_code=403, detail="Tài khoản chưa được gán vai trò.")

    return order_service.list_filtered_orders(
        db=db,
        current_user=customer,
        has_role_fn=has_role,
        pickup_date=pickup_date,
        status=status,
        pickup_slot_id=pickup_slot_id,
        slot_label=slot_label,
        page=page,
        limit=limit,
    )
