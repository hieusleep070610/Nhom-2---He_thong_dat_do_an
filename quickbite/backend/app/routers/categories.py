from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.dish_category import DishCategory
from app.models.food import Dish
from app.routers.auth import get_current_admin
from app.schemas.category import CategoryCreate, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Dish Categories"])


def serialize(row: DishCategory, db: Session) -> dict:
    return {"id": row.id, "name": row.name, "description": row.description,
            "is_active": row.is_active,
            "dish_count": db.query(Dish.id).filter(Dish.category_id == row.id, Dish.is_available.is_(True)).count()}


@router.get("")
def list_categories(_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return [serialize(row, db) for row in db.query(DishCategory).filter(DishCategory.is_active.is_(True)).order_by(DishCategory.id).all()]


@router.post("", status_code=201)
def create_category(data: CategoryCreate, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    row = DishCategory(name=data.name.strip(), description=(data.description or "").strip() or None)
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên danh mục đã tồn tại.") from error
    return {"message": "Đã tạo danh mục.", "category": serialize(row, db)}


@router.put("/{category_id}")
def update_category(category_id: int, data: CategoryUpdate, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    row = db.query(DishCategory).filter(DishCategory.id == category_id, DishCategory.is_active.is_(True)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục.")
    row.name = data.name.strip()
    row.description = (data.description or "").strip() or None
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên danh mục đã tồn tại.") from error
    return {"message": "Đã cập nhật danh mục.", "category": serialize(row, db)}


@router.delete("/{category_id}")
def delete_category(category_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    row = db.query(DishCategory).filter(DishCategory.id == category_id, DishCategory.is_active.is_(True)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy danh mục.")
    dish_count = db.query(Dish.id).filter(Dish.category_id == category_id, Dish.is_available.is_(True)).count()
    if dish_count:
        raise HTTPException(status_code=409, detail="Hãy chuyển món sang danh mục khác trước khi xóa.")
    row.is_active = False
    db.commit()
    return {"message": "Đã xóa danh mục."}
