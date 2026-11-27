from __future__ import annotations

from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.ingredient import Ingredient


def _to_decimal(value: Decimal | int | float | str | None, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    return Decimal(str(value))


def _serialize_inventory_item(ingredient: Ingredient) -> dict:
    stock_qty = _to_decimal(ingredient.stock_quantity, "0")
    min_stock = _to_decimal(ingredient.min_stock, "0")
    is_low_stock = stock_qty <= min_stock
    return {
        "ingredient_id": ingredient.Ingredient_ID,
        "ingredient_name": ingredient.Ingredient_Name,
        "unit": ingredient.Unit,
        "stock_quantity": stock_qty,
        "min_stock": min_stock,
        "is_active": bool(ingredient.is_active),
        "is_low_stock": is_low_stock,
        "deficit_quantity": max(min_stock - stock_qty, Decimal("0")),
        "warning": "Sắp hết nguyên liệu" if is_low_stock else None,
    }


def list_inventory(
    db: Session,
    *,
    low_stock_only: bool = False,
    is_active: bool | None = None,
    search: str | None = None,
) -> list[dict]:
    query = db.query(Ingredient)

    if is_active is not None:
        query = query.filter(Ingredient.is_active == is_active)

    if search and search.strip():
        keyword = f"%{search.strip()}%"
        query = query.filter(Ingredient.Ingredient_Name.ilike(keyword))

    ingredients = query.order_by(Ingredient.Ingredient_ID.asc()).all()
    items = [_serialize_inventory_item(item) for item in ingredients]

    if low_stock_only:
        items = [item for item in items if item["is_low_stock"]]

    return items


def list_low_stock_ingredients(
    db: Session,
    *,
    is_active: bool | None = True,
) -> list[dict]:
    return list_inventory(
        db,
        low_stock_only=True,
        is_active=is_active,
        search=None,
    )


def restock_ingredient(
    db: Session,
    ingredient_id: int,
    quantity: Decimal,
    note: str | None = None,
) -> dict:
    if quantity <= Decimal("0"):
        raise BadRequestException(message="Số lượng nhập kho phải lớn hơn 0.")

    ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.Ingredient_ID == ingredient_id)
        .with_for_update()
        .first()
    )
    if ingredient is None:
        raise NotFoundException(message=f"Không tìm thấy nguyên liệu với ID {ingredient_id}.")

    previous_stock = _to_decimal(ingredient.stock_quantity, "0")
    added_qty = _to_decimal(quantity, "0")
    new_stock = previous_stock + added_qty

    ingredient.stock_quantity = new_stock
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)

    return {
        **_serialize_inventory_item(ingredient),
        "action": "restock",
        "previous_stock": previous_stock,
        "delta_quantity": added_qty,
        "note": (note or "").strip() or None,
    }


def adjust_ingredient_stock(
    db: Session,
    ingredient_id: int,
    *,
    mode: Literal["set", "delta"] = "set",
    quantity: Decimal,
    reason: str | None = None,
) -> dict:
    ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.Ingredient_ID == ingredient_id)
        .with_for_update()
        .first()
    )
    if ingredient is None:
        raise NotFoundException(message=f"Không tìm thấy nguyên liệu với ID {ingredient_id}.")

    previous_stock = _to_decimal(ingredient.stock_quantity, "0")
    input_qty = _to_decimal(quantity, "0")

    if mode == "set":
        if input_qty < Decimal("0"):
            raise BadRequestException(message="Tồn kho điều chỉnh không được nhỏ hơn 0.")
        new_stock = input_qty
        delta_qty = new_stock - previous_stock
    elif mode == "delta":
        new_stock = previous_stock + input_qty
        if new_stock < Decimal("0"):
            raise BadRequestException(message="Tồn kho sau điều chỉnh không được nhỏ hơn 0.")
        delta_qty = input_qty
    else:
        raise BadRequestException(message="Chế độ điều chỉnh không hợp lệ.")

    ingredient.stock_quantity = new_stock
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)

    return {
        **_serialize_inventory_item(ingredient),
        "action": "adjust",
        "mode": mode,
        "previous_stock": previous_stock,
        "delta_quantity": delta_qty,
        "reason": (reason or "").strip() or None,
    }