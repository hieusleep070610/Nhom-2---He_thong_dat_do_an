from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.food import Dish
from app.models.ingredient import DishIngredient, Ingredient
from app.routers.auth import get_current_admin
from app.schemas.recipe import RecipeUpdate

router = APIRouter(prefix="/recipes", tags=["Recipes"])


@router.get("")
def list_recipes(_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dishes = db.query(Dish).filter(Dish.is_available.is_(True)).order_by(Dish.id).all()
    result = []
    for dish in dishes:
        rows = (db.query(DishIngredient, Ingredient)
                .join(Ingredient, Ingredient.Ingredient_ID == DishIngredient.Ingredient_ID)
                .filter(DishIngredient.Dish_ID == dish.id, Ingredient.is_active.is_(True)).all())
        items = [{"ingredient_id": ingredient.Ingredient_ID, "name": ingredient.Ingredient_Name,
                  "unit": ingredient.Unit, "quantity": float(link.Quantity),
                  "stock_quantity": float(ingredient.stock_quantity or 0)} for link, ingredient in rows]
        sufficient = all(item["stock_quantity"] >= item["quantity"] for item in items)
        result.append({"dish_id": dish.id, "dish_name": dish.name, "image_url": dish.image_url,
                       "price": float(dish.price), "ingredient_count": len(items),
                       "ingredients": items, "has_recipe": bool(items), "stock_ok": sufficient})
    return result


@router.get("/ingredients")
def list_recipe_ingredients(_admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.query(Ingredient).filter(Ingredient.is_active.is_(True)).order_by(Ingredient.Ingredient_Name).all()
    return [{"id": row.Ingredient_ID, "name": row.Ingredient_Name, "unit": row.Unit,
             "stock_quantity": row.stock_quantity} for row in rows]


@router.put("/{dish_id}")
def replace_recipe(dish_id: int, data: RecipeUpdate, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    dish = db.query(Dish).filter(Dish.id == dish_id, Dish.is_available.is_(True)).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn.")
    ids = [item.ingredient_id for item in data.ingredients]
    if len(ids) != len(set(ids)):
        raise HTTPException(status_code=422, detail="Không được lặp nguyên liệu trong công thức.")
    known = {row.Ingredient_ID for row in db.query(Ingredient).filter(Ingredient.Ingredient_ID.in_(ids), Ingredient.is_active.is_(True)).all()}
    if set(ids) != known:
        raise HTTPException(status_code=404, detail="Một hoặc nhiều nguyên liệu không tồn tại hoặc đã ngừng theo dõi.")
    db.query(DishIngredient).filter(DishIngredient.Dish_ID == dish_id).delete(synchronize_session=False)
    db.add_all([DishIngredient(Dish_ID=dish_id, Ingredient_ID=item.ingredient_id, Quantity=item.quantity) for item in data.ingredients])
    db.commit()
    return {"message": "Đã lưu công thức món ăn."}


@router.delete("/{dish_id}")
def delete_recipe(dish_id: int, _admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    if not db.query(Dish.id).filter(Dish.id == dish_id).first():
        raise HTTPException(status_code=404, detail="Không tìm thấy món ăn.")
    db.query(DishIngredient).filter(DishIngredient.Dish_ID == dish_id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Đã xóa định lượng công thức."}
