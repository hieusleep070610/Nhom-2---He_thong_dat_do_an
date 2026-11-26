"""
TF1B47E: [BE] Tối ưu truy vấn thực đơn
========================================
Các tối ưu được áp dụng:
  1. Thêm composite index (menu_date, dish_id) vào bảng daily_menus (xem models/menu.py)
  2. Thêm index riêng is_available vào bảng dishes
  3. Gom query: joinedload thay vì N+1 lazy SELECT
  4. Filter date trực tiếp trên DB (WHERE menu_date = ?) thay vì lấy hết rồi lọc Python
  5. Đo thời gian thực thi (ms) trả về trong response header X-Query-Time-Ms
     và trường benchmark trong body JSON khi ?benchmark=1
"""

import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session, joinedload

from app.database.db import get_db
from app.models.menu import DailyMenu, Dish

router = APIRouter(prefix="/menu", tags=["Menu Management"])


# ==============================================================================
# HELPER: đo thời gian truy vấn
# ==============================================================================
class _Timer:
    def __enter__(self):
        self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        self.elapsed_ms = round((time.perf_counter() - self._start) * 1000, 3)


# ==============================================================================
# GET /api/menu/dishes — lấy danh sách tất cả món đang bán
# TF1B47E: thêm joinedload daily_menus, filter is_available trên DB
# ==============================================================================
@router.get("/dishes", response_model=list)
def get_dishes(
    response: Response,
    benchmark: bool = Query(False, description="Trả về thông tin đo thời gian truy vấn"),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách món ăn đang bán kèm thực đơn ngày.

    **Tối ưu TF1B47E:**
    - Dùng `joinedload(Dish.daily_menus)` → 1 JOIN query thay vì N+1 SELECT
    - Filter `is_available = True` trực tiếp trên DB (tận dụng index ix_dishes_is_available)
    - Trả về header `X-Query-Time-Ms` để đo hiệu năng
    """
    with _Timer() as t:
        dishes = (
            db.query(Dish)
            .options(joinedload(Dish.daily_menus))   # gom JOIN, tránh N+1
            .filter(Dish.is_available.is_(True))     # dùng index is_available
            .order_by(Dish.id)
            .all()
        )

    response.headers["X-Query-Time-Ms"] = str(t.elapsed_ms)

    if benchmark:
        return {
            "benchmark": {
                "query_time_ms": t.elapsed_ms,
                "rows_returned": len(dishes),
                "optimization": "joinedload + is_available index",
            },
            "data": dishes,
        }
    return dishes


# ==============================================================================
# GET /api/menu/dishes/by-date?date=YYYY-MM-DD — thực đơn theo ngày (TF1B47E core)
# ==============================================================================
@router.get("/dishes/by-date", response_model=list)
def get_dishes_by_date(
    response: Response,
    menu_date: date = Query(..., description="Ngày cần xem thực đơn, định dạng YYYY-MM-DD"),
    benchmark: bool = Query(False, description="Trả về thông tin đo thời gian truy vấn"),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách món ăn trong thực đơn của một ngày cụ thể.

    **Tối ưu TF1B47E:**
    - WHERE `menu_date = ?` được xử lý bởi composite index `ix_daily_menus_date_dish`
    - `joinedload(DailyMenu.dish)` → 1 JOIN thay vì N+1 SELECT riêng lẻ cho từng dish
    - Filter `Dish.is_available = True` ở JOIN để tránh trả về món đã ngừng bán
    - Toàn bộ dữ liệu cần thiết lấy trong 1 lần round-trip DB
    """
    with _Timer() as t:
        daily_menus = (
            db.query(DailyMenu)
            .options(joinedload(DailyMenu.dish))          # JOIN dishes, tránh N+1
            .join(DailyMenu.dish)                         # explicit JOIN để filter
            .filter(
                DailyMenu.menu_date == menu_date,         # dùng composite index
                Dish.is_available.is_(True),              # lọc món đang bán
            )
            .order_by(DailyMenu.id)
            .all()
        )

    response.headers["X-Query-Time-Ms"] = str(t.elapsed_ms)

    result = [
        {
            "daily_menu_id": dm.id,
            "menu_date": str(dm.menu_date),
            "quantity": dm.quantity,
            "dish_id": dm.dish.id,
            "dish_name": dm.dish.name,
            "dish_price": dm.dish.price,
            "dish_description": dm.dish.description,
            "is_available": dm.dish.is_available,
        }
        for dm in daily_menus
        if dm.dish is not None
    ]

    if benchmark:
        return {
            "benchmark": {
                "query_time_ms": t.elapsed_ms,
                "menu_date": str(menu_date),
                "rows_returned": len(result),
                "optimization": "composite index ix_daily_menus_date_dish + joinedload",
            },
            "data": result,
        }
    return result


# ==============================================================================
# POST /api/menu/dishes — thêm món mới
# ==============================================================================
@router.post("/dishes", status_code=status.HTTP_201_CREATED)
def create_dish(
    name: str,
    price: float,
    description: str = None,
    db: Session = Depends(get_db),
):
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


# ==============================================================================
# DELETE /api/menu/dishes/{dish_id} — ẩn món (soft delete)
# ==============================================================================
@router.delete("/dishes/{dish_id}")
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn!")

    dish.is_available = False
    db.commit()
    return {"message": "Đã ngừng bán món ăn"}


# ==============================================================================
# POST /api/menu/daily-menus — gán món vào thực đơn ngày
# ==============================================================================
@router.post("/daily-menus", status_code=status.HTTP_201_CREATED)
def assign_daily_menu(
    menu_date: date,
    dish_id: int,
    quantity: int,
    db: Session = Depends(get_db),
):
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


# ==============================================================================
# GET /api/menu/daily-menus — lấy toàn bộ bảng phân công (có joinedload)
# TF1B47E: thêm joinedload để tránh N+1
# ==============================================================================
@router.get("/daily-menus")
def get_daily_menus(
    response: Response,
    benchmark: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    **Tối ưu TF1B47E:** joinedload(DailyMenu.dish) → 1 query thay vì N+1
    """
    with _Timer() as t:
        menus = (
            db.query(DailyMenu)
            .options(joinedload(DailyMenu.dish))
            .order_by(DailyMenu.menu_date.desc(), DailyMenu.id)
            .all()
        )

    response.headers["X-Query-Time-Ms"] = str(t.elapsed_ms)

    if benchmark:
        return {
            "benchmark": {
                "query_time_ms": t.elapsed_ms,
                "rows_returned": len(menus),
                "optimization": "joinedload(DailyMenu.dish)",
            },
            "data": menus,
        }
    return menus
