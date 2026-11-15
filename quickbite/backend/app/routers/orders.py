from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.order import Order
from app.models.order_status_history import OrderStatusHistory
from app.schemas.order import OrderStatusUpdate
from app.services.order_service import update_order_status
from app.core.exceptions import NotFoundException


router = APIRouter(
    tags=["Orders"],
    prefix="/orders"
)


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

    return {
        "status": "success",
        "message": "Cập nhật trạng thái đơn hàng thành công",
        "data": {
            "order_id": order.order_id,
            "order_status": order.order_status
        }
    }


# API xem lịch sử trạng thái đơn hàng
@router.get("/{order_id}/status-history")
def get_order_status_history(
    order_id: int,
    db: Session = Depends(get_db)
):
    # Kiểm tra đơn hàng có tồn tại không
    order = (
        db.query(Order)
        .filter(Order.order_id == order_id)
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