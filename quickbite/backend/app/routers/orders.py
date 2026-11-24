from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload
from datetime import date
from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.schemas.order import (
    CreatedOrderResponse,
    OrderCreate,
    OrderDetailResponse,
    OrderStatusUpdate,
    PaginatedOrderResponse,
)
from app.services import order_service
from app.services.order_service import update_order_status
from app.services.create_order_service import create_order
from app.core.exceptions import NotFoundException
from app.routers.auth import (
    get_current_customer,
    get_current_user,
    has_role,
)


router = APIRouter(tags=["Orders"], prefix="/orders")


@router.get("/me", response_model=PaginatedOrderResponse)
def get_my_orders(
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
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
    current_user=Depends(get_current_user),
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
    customer=Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    return create_order(
        db,
        customer=customer,
        pickup_date=request.pickup_date,
        pickup_slot_id=request.pickup_slot_id,
        items=[(item.dish_id, item.quantity) for item in request.items],
        note=request.note,
        payment_method=request.payment_method,
        delivery_address=request.delivery_address,
        coupon_code=request.coupon_code,
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
    )


@router.get("/mine")
def list_my_orders(
    customer=Depends(get_current_user),
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
def list_orders(customer=Depends(get_current_user), db: Session = Depends(get_db)):
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
    customer=Depends(get_current_user),
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
    customer=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if order is None or (
        order.user_id != customer.user_id
        and not has_role(customer, "admin", "kitchen")
    ):
        raise NotFoundException(
            message=f"Không tìm thấy đơn hàng có ID {order_id}"
        )

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
                "changed_by": item.changed_by
            }
            for item in histories
        ]
    }

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