from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload
from typing import Optional

from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.schemas.order import OrderStatusUpdate, OrderDetailResponse, PaginatedOrderResponse
from app.services.order_service import update_order_status
from app.core.exceptions import NotFoundException
from app.routers.auth import get_current_user
from app.services import order_service


router = APIRouter(tags=["Orders"], prefix="/orders")

@router.get("/me", response_model=PaginatedOrderResponse)
def get_my_orders(
    status: Optional[str] = Query(
        default=None,
        description="Lọc theo trạng thái: pending, confirmed, preparing, ready, completed, cancelled",
    ),
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

@router.get("")
def list_orders(db: Session = Depends(get_db)):
    rows = (
        db.query(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    
    return [
        {
            "id": row.id,
            "code": row.code,
            "customer_name": row.customer_name,
            "status": row.status,
            "total_amount": float(row.total_amount),
            # Lấy tên món từ mảng items
            "title": row.items[0].item_name if row.items else f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]

@router.patch("/{order_id}/status")
def change_order_status(order_id: int, request: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = update_order_status(db=db, order_id=order_id, new_status=request.new_status)

    return {
        "status": "success",
        "message": "Cập nhật trạng thái đơn hàng thành công",
        "data": {
            "order_id": order.id,
            "order_status": order.order_status
        }
    }


@router.get("/{order_id}/status-history")
def get_order_status_history(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if order is None:
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