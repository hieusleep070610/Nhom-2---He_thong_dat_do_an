"""Điểm khởi động của backend.

Chạy:  uvicorn app.main:app --reload
Tài liệu API tự sinh: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from app.db.database import engine, Base
import app.models.menu_models  # Import để SQLAlchemy nhận diện các bảng

# Lệnh này tự động tạo các bảng trong SQL nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Hệ Thống Đặt Đồ Ăn")

@app.get("/")
def home():
    return {"message": "Hệ thống đặt đồ ăn đang chạy và các bảng CSDL đã được tạo!"}
