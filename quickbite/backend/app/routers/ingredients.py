from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.ingredient import DishIngredient, Ingredient
from app.schemas.ingredient import IngredientCreate, IngredientUpdate
from app.routers.auth import get_current_admin

router = APIRouter(prefix="/ingredients", tags=["Ingredients"])


def _output(row: Ingredient) -> dict:
    return {
        "id": row.Ingredient_ID,
        "name": row.Ingredient_Name,
        "unit": row.Unit,
        "stock_quantity": row.stock_quantity,
        "min_stock": row.min_stock,
        "is_active": row.is_active,
        "is_low": row.stock_quantity is None or row.stock_quantity <= row.min_stock,
    }


@router.get("")
def list_ingredients(_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.query(Ingredient).filter(Ingredient.is_active.is_(True)).order_by(Ingredient.Ingredient_ID).all()
    return [_output(row) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_ingredient(data: IngredientCreate, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    row = Ingredient(
        Ingredient_Name=data.name.strip(), Unit=data.unit.strip(),
        stock_quantity=data.stock_quantity, min_stock=data.min_stock, is_active=True,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên nguyên liệu đã tồn tại.") from error
    return {"message": "Đã thêm nguyên liệu.", "ingredient": _output(row)}


@router.put("/{ingredient_id}")
def update_ingredient(
    ingredient_id: int,
    data: IngredientUpdate,
    _admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    row = db.query(Ingredient).filter(Ingredient.Ingredient_ID == ingredient_id, Ingredient.is_active.is_(True)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguyên liệu.")
    row.Ingredient_Name = data.name.strip()
    row.Unit = data.unit.strip()
    row.stock_quantity = data.stock_quantity
    row.min_stock = data.min_stock
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên nguyên liệu đã tồn tại.") from error
    return {"message": "Đã cập nhật nguyên liệu.", "ingredient": _output(row)}


@router.delete("/{ingredient_id}")
def delete_ingredient(ingredient_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    row = db.query(Ingredient).filter(Ingredient.Ingredient_ID == ingredient_id, Ingredient.is_active.is_(True)).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy nguyên liệu.")
    recipe_count = db.query(DishIngredient.Dish_Ingredient_ID).filter(DishIngredient.Ingredient_ID == ingredient_id).count()
    if recipe_count:
        raise HTTPException(status_code=409, detail="Nguyên liệu đang được dùng trong công thức. Hãy cập nhật công thức trước.")
    row.is_active = False
    db.commit()
    return {"message": "Đã ngừng theo dõi nguyên liệu."}
