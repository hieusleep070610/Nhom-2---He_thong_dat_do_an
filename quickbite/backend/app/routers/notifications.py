from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.routers.auth import get_current_user
from app.services.order_notification_service import (
    list_my_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def get_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_my_notifications(
        db=db,
        user_id=current_user.user_id,
        unread_only=unread_only,
        limit=limit,
    )


@router.patch("/{notification_id}/read")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    notif = mark_notification_as_read(
        db=db,
        user_id=current_user.user_id,
        notification_id=notification_id,
    )
    return {"id": notif.id, "is_read": notif.is_read}


@router.post("/read-all")
def read_all_notifications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    updated_count = mark_all_notifications_as_read(
        db=db,
        user_id=current_user.user_id,
    )
    return {"updated_count": updated_count}