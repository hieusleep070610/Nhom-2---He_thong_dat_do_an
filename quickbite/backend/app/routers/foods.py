import math
import unicodedata
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from datetime import timezone, timedelta

from app.core.exceptions import NotFoundException
from app.database.db import get_db
from app.models.food import Dish, DailyMenu
from app.models.pickup_slot import PickupSlot, SlotDailyQuota
from app.schemas.menu import RemainingMenuResponse, PickupSlotsResponse
from app.services.menu_availability_service import get_remaining_by_date

router = APIRouter(prefix="/menu", tags=["Menu Management"])
search_router = APIRouter(tags=["Dish Search"])


def _normalize_name(value: str) -> str:
    value = value.replace("đ", "d").replace("Đ", "d")
    value = unicodedata.normalize("NFD", value)
    return "".join(char for char in value if unicodedata.category(char) != "Mn").casefold().strip()


@search_router.get("/dishes/search")
@search_router.get("/search", include_in_schema=False)
def search_dishes(
    q: str | None = None,
    keyword: str | None = None,
    name: str | None = None,
    page: int = 1,
    limit: int | None = None,
    page_size: int | None = None,
    strict_empty: bool = False,
    db: Session = Depends(get_db),
):
    raw_keyword = q if q is not None else keyword if keyword is not None else name or ""
    clean_keyword = raw_keyword.strip()
    empty_keyword = not clean_keyword
    if empty_keyword and strict_empty:
        raise HTTPException(status_code=400, detail="Từ khóa tìm kiếm không được để trống.")

    page_num = max(1, page)
    limit_num = limit if limit is not None else page_size if page_size is not None else 6
    limit_num = min(50, max(1, limit_num))

    dishes = db.query(Dish).filter(Dish.is_available.is_(True)).order_by(Dish.id).all()
    normalized_keyword = _normalize_name(clean_keyword)
    words = normalized_keyword.split()
    if words:
        dishes = [
            dish for dish in dishes
            if normalized_keyword in _normalize_name(dish.name)
            or all(word in _normalize_name(dish.name) for word in words)
        ]

    total_items = len(dishes)
    total_pages = math.ceil(total_items / limit_num) if total_items else 0
    start = (page_num - 1) * limit_num
    page_items = dishes[start:start + limit_num]
    if empty_keyword:
        message = "Từ khóa tìm kiếm rỗng. Hệ thống trả về toàn bộ danh sách món ăn có phân trang."
    elif total_items:
        message = f"Tìm thấy {total_items} món ăn phù hợp với từ khóa '{clean_keyword}'."
    else:
        message = f"Không tìm thấy món ăn nào có tên phù hợp với từ khóa '{clean_keyword}'."

    pagination = {
        "page": page_num,
        "limit": limit_num,
        "total_items": total_items,
        "total_pages": total_pages,
        "has_next": page_num < total_pages,
        "has_prev": page_num > 1 and total_pages > 0,
    }
    return {
        "success": True,
        "task_id": "TF1A8D7",
        "keyword": clean_keyword,
        "is_empty_keyword": empty_keyword,
        **pagination,
        "pagination": pagination,
        "message": message,
        "data": [
            {
                "id": dish.id,
                "name": dish.name,
                "price": dish.price,
                "price_formatted": f"{dish.price:,.0f} ₫".replace(",", "."),
                "description": dish.description,
                "is_available": dish.is_available,
            }
            for dish in page_items
        ],
    }

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
    now = datetime.now(timezone(timedelta(hours=7)))
    for slot, quota in rows:
        capacity = int(quota.max_servings if quota else slot.max_servings)
        booked = int(quota.booked_servings if quota else 0)
        remaining = max(0, capacity - booked)
        is_past = service_date < now.date() or (
            service_date == now.date() and slot.start_time <= now.time().replace(tzinfo=None)
        )
        is_active = bool(slot.is_active)
        slots.append({
            "pickup_slot_id": slot.id,
            "label": slot.label,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "max_servings": capacity,
            "booked_servings": booked,
            "remaining_servings": remaining,
            "is_active": is_active,
            "is_full": remaining == 0,
            "is_past": is_past,
            "can_book": is_active and remaining > 0 and not is_past,
        })
    return {"service_date": service_date, "slots": slots}
