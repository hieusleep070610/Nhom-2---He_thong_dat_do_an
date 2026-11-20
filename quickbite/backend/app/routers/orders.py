from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.exceptions import NotFoundException
from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.schemas.order import CreatedOrderResponse, OrderCreate
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.order import OrderStatusUpdate
from app.services.order_service import update_order_status
from app.services.create_order_service import create_order

router = APIRouter(tags=["Orders"], prefix="/orders")


@router.post("", response_model=CreatedOrderResponse, status_code=status.HTTP_201_CREATED)
def create_order_route(
    payload: OrderCreate,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=100),
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_order(
        db,
        customer=customer,
        pickup_date=payload.pickup_date,
        pickup_slot_id=payload.pickup_slot_id,
        items=[(item.dish_id, item.quantity) for item in payload.items],
        note=payload.note,
        payment_method=payload.payment_method,
        coupon_code=payload.coupon_code,
        idempotency_key=idempotency_key.strip() if idempotency_key else None,
    )

def _is_admin(customer: User) -> bool:
    return customer.user_id in settings.admin_user_ids


def _get_order_or_404(db: Session, order_id: int, customer: User) -> Order:
    order = db.query(Order).filter(Order.id == order_id).first()
    if order is None or (order.user_id != customer.user_id and not _is_admin(customer)):
        raise NotFoundException(message=f"Không tìm thấy đơn hàng có ID {order_id}")
    return order


@router.get("/mine")
def list_my_orders(customer: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
            "title": ", ".join(item.item_name for item in row.items) or f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]


@router.get("")
def list_orders(customer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Order).options(selectinload(Order.items))
    if not _is_admin(customer):
        query = query.filter(Order.user_id == customer.user_id)
    rows = query.order_by(Order.created_at.desc()).all()
    return [
        {
            "id": row.id,
            "code": row.code,
            "customer_name": row.customer_name,
            "status": row.status,
            "total_amount": float(row.total_amount),
            "title": row.items[0].item_name if row.items else f"Đơn hàng #{row.id}",
        }
        for row in rows
    ]


@router.patch("/{order_id}/status")
def change_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_order_or_404(db, order_id, customer)
    if not _is_admin(customer) and payload.new_status.strip().lower() != "cancelled":
        raise HTTPException(status_code=403, detail="Khách hàng chỉ có thể yêu cầu hủy đơn của mình.")
    order = update_order_status(db=db, order_id=order_id, new_status=payload.new_status)
    return {
        "status": "success",
        "message": "Cập nhật trạng thái đơn hàng thành công",
        "data": {"order_id": order.id, "order_status": order.status},
    }


@router.get("/{order_id}/status-history")
def get_order_status_history(
    order_id: int,
    customer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_order_or_404(db, order_id, customer)
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