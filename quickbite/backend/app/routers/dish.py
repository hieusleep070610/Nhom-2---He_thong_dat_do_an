import math
import unicodedata
from decimal import Decimal
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, contains_eager, joinedload
from datetime import date, datetime
from datetime import timezone, timedelta

from app.core.exceptions import NotFoundException
from app.database.db import get_db
from app.models.food import Dish, DishPriceHistory, DailyMenu
from app.models.dish_category import DishCategory
from app.models.pickup_slot import PickupSlot, SlotDailyQuota
from app.schemas.menu import (
    RemainingMenuResponse,
    PickupSlotsResponse,
    DishPriceUpdateRequest,
    DishPriceUpdateResponse,
    DishPriceHistoryResponse,
)
from app.schemas.dish import DishOut
from app.services.menu_availability_service import get_remaining_by_date
from app.services.cloudinary_service import (
    CloudinaryNotConfigured,
    delete_dish_image,
    upload_dish_image,
)
from app.core.config import settings
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/menu", tags=["Menu Management"])
search_router = APIRouter(tags=["Dish Search"])


def _normalize_name(value: str) -> str:
    value = value.replace("đ", "d").replace("Đ", "d")
    value = unicodedata.normalize("NFD", value)
    return "".join(char for char in value if unicodedata.category(char) != "Mn").casefold().strip()


def _extract_admin_identifier(admin_user) -> str | None:
    if admin_user is None:
        return None
    if isinstance(admin_user, dict):
        return admin_user.get("username") or admin_user.get("email") or str(admin_user.get("id") or "")
    for attr in ("username", "email", "full_name", "name", "id"):
        value = getattr(admin_user, attr, None)
        if value is not None:
            return str(value)
    return str(admin_user)


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
                "image_url": dish.image_url,
                "category_id": dish.category_id,
                "category_name": dish.category.name if dish.category else None,
            }
            for dish in page_items
        ],
    }

@router.get("/dishes", response_model=list[DishOut])
def get_dishes(db: Session = Depends(get_db)):
    return (
        db.query(Dish)
        .options(joinedload(Dish.category))
        .filter(Dish.is_available.is_(True))
        .order_by(Dish.id)
        .all()
    )

@router.post("/dishes", status_code=status.HTTP_201_CREATED)
def create_dish(
    name: str,
    price: Decimal,
    description: str = None,
    category_id: int | None = Query(default=None, gt=0),
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Tên món không được để trống.")
    if price <= 0:
        raise HTTPException(status_code=422, detail="Giá món phải lớn hơn 0.")

    existing = db.query(Dish).filter(Dish.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Món ăn này đã tồn tại!")

    if category_id is not None and not db.query(DishCategory.id).filter(DishCategory.id == category_id, DishCategory.is_active.is_(True)).first():
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục đang hoạt động.")
    new_dish = Dish(name=name, price=price, description=description, category_id=category_id)
    db.add(new_dish)
    db.flush()
    db.add(DishPriceHistory(
        dish_id=new_dish.id,
        old_price=None,
        new_price=price,
        reason="Khởi tạo giá món ăn mới",
        changed_by=_extract_admin_identifier(_admin),
    ))
    db.commit()
    db.refresh(new_dish)
    return {"message": "Thêm món ăn thành công", "dish": new_dish}


@router.put("/dishes/{dish_id}")
def update_dish(
    dish_id: int,
    name: str,
    price: Decimal,
    description: str = "",
    category_id: int | None = Query(default=None, gt=0),
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Tên món không được để trống.")
    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.is_available.is_(True)).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn đang hoạt động.")
    if price <= 0:
        raise HTTPException(status_code=422, detail="Giá món phải lớn hơn 0.")
    duplicate = db.query(Dish).filter(Dish.name == name, Dish.id != dish_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Tên món ăn đã được sử dụng.")
    if category_id is not None and not db.query(DishCategory.id).filter(DishCategory.id == category_id, DishCategory.is_active.is_(True)).first():
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục đang hoạt động.")
    old_price = Decimal(str(dish.price))
    dish.name = name.strip()
    dish.price = price
    dish.description = description.strip() or None
    dish.category_id = category_id
    if old_price != Decimal(str(price)):
        db.add(DishPriceHistory(
            dish_id=dish.id,
            old_price=old_price,
            new_price=price,
            reason="Cập nhật giá món ăn",
            changed_by=_extract_admin_identifier(_admin),
        ))
    db.commit()
    db.refresh(dish)
    return {"message": "Cập nhật món ăn thành công.", "dish": dish}


@router.patch("/dishes/{dish_id}/price", response_model=DishPriceUpdateResponse)
def update_dish_price(
    dish_id: int,
    payload: DishPriceUpdateRequest,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn!")

    old_price = Decimal(str(dish.price))
    new_price = Decimal(str(payload.new_price))
    if old_price == new_price:
        raise HTTPException(status_code=400, detail="Giá mới phải khác giá hiện tại của món ăn.")

    dish.price = new_price
    history_entry = DishPriceHistory(
        dish_id=dish.id,
        old_price=old_price,
        new_price=new_price,
        reason=payload.reason.strip() if payload.reason and payload.reason.strip() else "Cập nhật giá món ăn",
        changed_by=_extract_admin_identifier(_admin),
    )
    db.add(history_entry)
    db.commit()
    db.refresh(dish)
    db.refresh(history_entry)
    return {
        "message": "Cập nhật giá món ăn thành công",
        "dish_id": dish.id,
        "dish_name": dish.name,
        "old_price": old_price,
        "new_price": new_price,
        "history": history_entry,
    }


@router.get("/dishes/{dish_id}/price-history", response_model=DishPriceHistoryResponse)
def get_dish_price_history(dish_id: int, db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn!")
    history_rows = (
        db.query(DishPriceHistory)
        .filter(DishPriceHistory.dish_id == dish.id)
        .order_by(DishPriceHistory.changed_at.desc(), DishPriceHistory.id.desc())
        .all()
    )
    return {
        "dish_id": dish.id,
        "dish_name": dish.name,
        "current_price": Decimal(str(dish.price)),
        "history": history_rows,
    }


@router.post("/dishes/{dish_id}/image")
async def upload_dish_photo(
    dish_id: int,
    image: UploadFile = File(...),
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn.")

    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.")

    max_bytes = settings.CLOUDINARY_MAX_IMAGE_SIZE_MB * 1024 * 1024
    content = await image.read(max_bytes + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Tệp ảnh đang trống.")
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Ảnh vượt quá {settings.CLOUDINARY_MAX_IMAGE_SIZE_MB} MB.")

    try:
        extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[image.content_type]
        uploaded = upload_dish_image(content, filename=f"dish-{dish_id}.{extension}")
    except CloudinaryNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Không thể tải ảnh lên Cloudinary.") from error

    old_public_id = dish.image_public_id
    new_public_id = uploaded.get("public_id")
    dish.image_url = uploaded.get("secure_url")
    dish.image_public_id = new_public_id
    if not dish.image_url or not dish.image_public_id:
        db.rollback()
        try:
            delete_dish_image(uploaded.get("public_id"))
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Cloudinary không trả về thông tin ảnh hợp lệ.")

    try:
        db.commit()
        db.refresh(dish)
    except Exception as error:
        db.rollback()
        try:
            delete_dish_image(new_public_id)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Không thể lưu ảnh vào cơ sở dữ liệu.") from error

    if old_public_id and old_public_id != dish.image_public_id:
        try:
            delete_dish_image(old_public_id)
        except Exception:
            pass
    return {"message": "Đã cập nhật ảnh món ăn.", "image_url": dish.image_url}

@router.delete("/dishes/{dish_id}")
def delete_dish(dish_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn!")

    dish.is_available = False
    db.commit()
    return {"message": "Đã ngừng bán món ăn"}

@router.post("/daily-menus", status_code=status.HTTP_201_CREATED)
def assign_daily_menu(
    menu_date: date,
    dish_id: int,
    quantity: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if quantity <= 0:
        raise HTTPException(status_code=422, detail="Số lượng định mức phải lớn hơn 0.")

    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.is_available.is_(True)).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Món ăn không tồn tại để gán vào thực đơn!")

    duplicate = db.query(DailyMenu).filter(
        DailyMenu.menu_date == menu_date, DailyMenu.dish_id == dish_id
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Món này đã được gán vào thực đơn trong ngày đã chọn.")

    assignment = DailyMenu(menu_date=menu_date, dish_id=dish_id, quantity=quantity)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"message": "Gán món vào thực đơn thành công", "data": assignment}

@router.get("/daily-menus")
def get_daily_menus(menu_date: date | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(DailyMenu)
        .join(Dish)
        .options(contains_eager(DailyMenu.dish))
        .filter(Dish.is_available.is_(True))
    )
    if menu_date:
        query = query.filter(DailyMenu.menu_date == menu_date)
    rows = query.order_by(DailyMenu.menu_date.desc(), DailyMenu.id.desc()).all()
    return [{
        "id": row.id,
        "menu_date": row.menu_date,
        "dish_id": row.dish_id,
        "dish_name": row.dish.name,
        "image_url": row.dish.image_url,
        "quantity": row.quantity,
    } for row in rows]


@router.put("/daily-menus/{assignment_id}")
def update_daily_menu(
    assignment_id: int,
    menu_date: date,
    dish_id: int,
    quantity: int,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    assignment = db.query(DailyMenu).filter(DailyMenu.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục thực đơn.")
    if quantity <= 0:
        raise HTTPException(status_code=422, detail="Số lượng định mức phải lớn hơn 0.")
    if not db.query(Dish.id).filter(Dish.id == dish_id, Dish.is_available.is_(True)).first():
        raise HTTPException(status_code=404, detail="Món ăn không tồn tại hoặc đã ngừng bán.")
    duplicate = db.query(DailyMenu).filter(
        DailyMenu.menu_date == menu_date,
        DailyMenu.dish_id == dish_id,
        DailyMenu.id != assignment_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Món này đã có trong thực đơn ngày đã chọn.")
    assignment.menu_date = menu_date
    assignment.dish_id = dish_id
    assignment.quantity = quantity
    db.commit()
    return {"message": "Cập nhật thực đơn thành công."}


@router.delete("/daily-menus/{assignment_id}")
def delete_daily_menu(assignment_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    assignment = db.query(DailyMenu).filter(DailyMenu.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy mục thực đơn.")
    db.delete(assignment)
    db.commit()
    return {"message": "Đã xóa món khỏi thực đơn ngày."}


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
