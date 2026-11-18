"""Kiểm tra server và kết nối DB còn sống không: GET /api/health"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.core.exceptions import unified_error_response, unified_success_response

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return unified_success_response(
            message="Hệ thống hoạt động bình thường",
            data={"status": "ok", "database": "connected"},
        )
    except Exception as error:  # noqa: BLE001 - muốn bắt mọi lỗi kết nối để báo ra
        return unified_error_response(
            status_code=503,
            message="Không thể kết nối cơ sở dữ liệu",
            details={"database": "disconnected", "detail": str(error)},
        )
