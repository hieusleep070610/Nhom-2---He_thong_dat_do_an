from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date

from app.core.exceptions import NotFoundException
from app.database.db import get_db
from app.models.food import Dish, DailyMenu
from app.models.pickup_slot import PickupSlot, SlotDailyQuota
from app.schemas.menu import RemainingMenuResponse, PickupSlotsResponse
from app.schemas.dish import DishOut
from app.services.menu_availability_service import get_remaining_by_date

router = APIRouter(prefix="/menu", tags=["Menu Management"])

@router.get("/dishes", response_model=list[DishOut])
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


@router.get("/daily-menus/remaining", response_model=RemainingMenuResponse)
def get_daily_menu_remaining(
    menu_date: date,
    dish_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    if dish_id is not None and not db.query(Dish.id).filter(Dish.id == dish_id).first():
        raise NotFoundException(message=f"Không tìm thấy món ăn có ID {dish_id}.")
    return {"menu_date": menu_date, "items": get_remaining_by_date(db, menu_date, dish_id)}


@router.get("/pickup-slots", response_model=PickupSlotsResponse, tags=["Pickup Slots"])
def get_pickup_slots(service_date: date, db: Session = Depends(get_db)):
    """Danh sách slot ngày nhận. Chưa có quota riêng thì dùng max_servings của slot."""
    rows = (
        db.query(PickupSlot, SlotDailyQuota)
        .outerjoin(
            SlotDailyQuota,
            (SlotDailyQuota.pickup_slot_id == PickupSlot.id)
            & (SlotDailyQuota.service_date == service_date),
        )
        .order_by(PickupSlot.start_time, PickupSlot.id)
        .all()
    )
    slots = []
    for slot, quota in rows:
        capacity = int(quota.max_servings if quota else slot.max_servings)
        booked = int(quota.booked_servings if quota else 0)
        remaining = max(0, capacity - booked)
        slots.append({
            "pickup_slot_id": slot.id,
            "label": slot.label,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "remaining_servings": remaining,
            "is_active": bool(slot.is_active),
            "is_full": remaining == 0,
        })
    return {"service_date": service_date, "slots": slots}
