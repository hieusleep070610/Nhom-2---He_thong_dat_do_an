from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List

from app.database.db import get_db
from app.models.menu import Dish, DailyMenu

router = APIRouter(prefix="/menu", tags=["Menu Management"])

@router.get("/dishes", response_model=list)
def get_dishes(db: Session = Depends(get_db)):
    return db.query(Dish).filter(Dish.is_available.is_(True)).all()

@router.post("/dishes", status_code=status.HTTP_201_CREATED)
def create_dish(name: str, price: float, description: str = None, db: Session = Depends(get_db)):
    if price <= 0:
        raise HTTPException(status_code=422, detail="Giá món phải lớn hơn 0.")

    existing = db.query(Dish).filter(Dish.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Món ăn này đã tồn tại!")

    new_dish = Dish(name=name, price=price, description=description)
    db.add(new_dish)
    db.commit()
    db.refresh(new_dish)
    return {"message": "Thêm món ăn thành công", "dish": new_dish}

@router.delete("/dishes/{dish_id}")
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn!")

    dish.is_available = False
    db.commit()
    return {"message": "Đã ngừng bán món ăn"}

@router.post("/daily-menus", status_code=status.HTTP_201_CREATED)
def assign_daily_menu(menu_date: date, dish_id: int, quantity: int, db: Session = Depends(get_db)):
    if quantity <= 0:
        raise HTTPException(status_code=422, detail="Số lượng định mức phải lớn hơn 0.")

    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.is_available.is_(True)).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Món ăn không tồn tại để gán vào thực đơn!")

    assignment = DailyMenu(menu_date=menu_date, dish_id=dish_id, quantity=quantity)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Gán món vào thực đơn thành công", "data": assignment}

@router.get("/daily-menus")
def get_daily_menus(db: Session = Depends(get_db)):
    return db.query(DailyMenu).all()