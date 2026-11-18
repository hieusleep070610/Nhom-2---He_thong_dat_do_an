from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.schemas.order import OrderStatusUpdate
from app.services.order_service import update_order_status
from app.core.exceptions import NotFoundException, unified_success_response


router = APIRouter(
    tags=["Orders"],
    prefix="/orders"
)


@router.get("")
def list_orders(db: Session = Depends(get_db)):
    rows = (
        db.query(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    data = [
        {
            "id": row.id,
            "code": row.code,
            "status": row.status,
            "title": row.items[0].item_name if row.items else row.code,
        }
        for row in rows
    ]
    return unified_success_response(message="Lấy danh sách đơn hàng thành công", data=data)


# API cập nhật trạng thái đơn hàng
@router.patch("/{order_id}/status")
def change_order_status(
    order_id: int,
    request: OrderStatusUpdate,
    db: Session = Depends(get_db)
):
    order = update_order_status(
        db=db,
        order_id=order_id,
        new_status=request.new_status
    )

    return unified_success_response(
        message="Cập nhật trạng thái đơn hàng thành công",
        data={
            "order_id": order.id,
            "order_status": order.status
        },
    )


# API xem lịch sử trạng thái đơn hàng
@router.get("/{order_id}/status-history")
def get_order_status_history(
    order_id: int,
    db: Session = Depends(get_db)
):
    # Kiểm tra đơn hàng có tồn tại không
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .first()
    )

    if order is None:
        raise NotFoundException(
            message=f"Không tìm thấy đơn hàng có ID {order_id}"
        )

    # Lấy lịch sử thay đổi trạng thái
    histories = (
        db.query(OrderStatusHistory)
        .filter(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.history_id.asc())
        .all()
    )

    return unified_success_response(
        message="Lấy lịch sử trạng thái đơn hàng thành công",
        data=[
            {
                "history_id": item.history_id,
                "order_id": item.order_id,
                "old_status": item.old_status,
                "new_status": item.new_status,
                "changed_at": item.changed_at,
                "changed_by": item.changed_by
            }
            for item in histories
        ],
    )