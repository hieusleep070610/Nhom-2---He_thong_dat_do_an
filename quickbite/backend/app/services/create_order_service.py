from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.food import Dish
from app.models.dish_topping import DishTopping
from app.models.ingredient import DishIngredient, Ingredient
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_item_ingredient_snapshot import OrderItemIngredientSnapshot
from app.models.order_status_history import OrderStatusHistory
from app.models.user import User
from app.models.wallet import WalletModel, WalletTransactionModel
from app.services.menu_availability_service import ensure_servings_available
from app.services.pickup_slot_quota_service import reserve_slot_servings
from app.services.refund_service import payment_key

_LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def create_order(
    db: Session,
    *,
    customer: User,
    pickup_date: date,
    pickup_slot_id: int,
    items: list[tuple],
    note: str | None,
    payment_method: str,
    coupon_code: str | None,
    idempotency_key: str | None,
    delivery_address: str | None = None,
) -> dict:
    topping_line_quantities: dict[tuple[int, tuple[str, ...], str], int] = {}
    base_items = []
    for item in items:
        dish_id, quantity = item[:2]
        selected_toppings = tuple(sorted(set(item[2]))) if len(item) > 2 else ()
        size = item[3] if len(item) > 3 else "medium"
        if size not in {"small", "medium", "large"}:
            raise BadRequestException(message="Kích cỡ món không hợp lệ.")
        base_items.append((dish_id, quantity))
        line_key = (dish_id, selected_toppings, size)
        topping_line_quantities[line_key] = topping_line_quantities.get(line_key, 0) + quantity
    order_lines = [
        (dish_id, quantity, list(toppings), size)
        for (dish_id, toppings, size), quantity in sorted(topping_line_quantities.items())
    ]
    requested = _normalize_items(base_items)
    effective_address = (delivery_address or "").strip() or (customer.address or "").strip()
    request_hash = _request_hash(
        pickup_date, pickup_slot_id, requested, effective_address, note, payment_method, coupon_code,
        order_lines,
    )
    if idempotency_key and (prior := _find_idempotent_order(db, idempotency_key)):
        return _replay_or_conflict(prior, customer.user_id, request_hash)

    _validate_order_input(customer, pickup_date, effective_address, payment_method, coupon_code)
    phone = customer.phone.strip()

    try:
        serving_count = sum(qty for _, qty in requested)
        reserve_slot_servings(db, pickup_slot_id, pickup_date, serving_count)

        by_id = _lock_and_check_dishes(db, [dish_id for dish_id, _ in requested])
        ensure_servings_available(db, pickup_date, requested, lock=True)
        recipe_rows, locked_ingredients = _lock_and_check_ingredients(db, requested, order_lines)

        priced_items, subtotal = _price_items(requested, by_id, order_lines, db)
        total = max(Decimal("0"), subtotal)

        wallet = _lock_and_check_wallet(db, customer.user_id, payment_method, total)

        order = Order(
            code=f"FD{pickup_date:%Y%m%d}{secrets.token_hex(3).upper()}",
            customer_name=customer.full_name,
            customer_phone=phone,
            delivery_address=effective_address,
            user_id=customer.user_id,
            note=(note or "").strip() or None,
            pickup_date=pickup_date,
            pickup_slot_id=pickup_slot_id,
            status="confirmed",
            payment_method=payment_method,
            payment_status="paid" if payment_method == "wallet" else "unpaid",
            discount_amount=Decimal("0"),
            total_amount=total,
            idempotency_key=idempotency_key,
            request_hash=request_hash if idempotency_key else None,
        )
        db.add(order)
        db.flush()

        order_items = _create_order_items(db, order.id, priced_items)
        _save_recipe_snapshots(db, order_items, recipe_rows, priced_items)
        _deduct_ingredients(order_lines, recipe_rows, locked_ingredients)

        if wallet is not None:
            wallet.balance = Decimal(wallet.balance) - total
            db.add(
                WalletTransactionModel(
                    wallet_id=wallet.id,
                    type_transaction=payment_key(order.id),
                    amount_money=-total,
                )
            )

        db.add(
            OrderStatusHistory(
                order_id=order.id,
                old_status=None,
                new_status="confirmed",
                changed_by=str(customer.user_id),
            )
        )
        db.commit()
        db.refresh(order)
        return _order_response(order, order_items, subtotal)
    except IntegrityError as error:
        db.rollback()
        if idempotency_key and (prior := _find_idempotent_order(db, idempotency_key)):
            return _replay_or_conflict(prior, customer.user_id, request_hash)
        raise ConflictException(
            message="Không thể tạo đơn do dữ liệu bị trùng hoặc thay đổi đồng thời.",
            code="ORDER_CONFLICT",
        ) from error
    except Exception:
        db.rollback()
        raise


def _validate_order_input(
    customer: User,
    pickup_date: date,
    effective_address: str,
    payment_method: str,
    coupon_code: str | None,
) -> None:
    if not effective_address:
        raise BadRequestException(
            message="Vui lòng nhập địa chỉ nhận hàng hoặc cập nhật địa chỉ trong trang cá nhân.",
            details={"code": "CUSTOMER_ADDRESS_REQUIRED"},
        )
    phone = (customer.phone or "").strip()
    if not phone:
        raise BadRequestException(
            message="Tài khoản cần có số điện thoại trước khi đặt hàng.",
            details={"code": "CUSTOMER_PHONE_REQUIRED"},
        )
    if not re.fullmatch(r"0[0-9]{8,10}", phone):
        raise BadRequestException(
            message="Tài khoản cần có số điện thoại hợp lệ trước khi đặt hàng.",
            details={"code": "INVALID_CUSTOMER_PHONE"},
        )
    if pickup_date < datetime.now(_LOCAL_TIMEZONE).date():
        raise BadRequestException(message="Ngày nhận món không được ở trong quá khứ.")
    if coupon_code and coupon_code.strip():
        raise BadRequestException(message="Mã giảm giá không hợp lệ.", details={"code": "INVALID_COUPON"})
    if payment_method not in {"wallet", "cod"}:
        raise BadRequestException(
            message="Phương thức thanh toán không được hỗ trợ.",
            details={"code": "UNSUPPORTED_PAYMENT_METHOD"},
        )


def _lock_and_check_dishes(db: Session, dish_ids: list[int]) -> dict[int, Dish]:
    dishes = (
        db.query(Dish).filter(Dish.id.in_(dish_ids)).order_by(Dish.id).with_for_update().all()
    )
    by_id = {dish.id: dish for dish in dishes}
    missing = sorted(set(dish_ids) - set(by_id))
    if missing:
        raise NotFoundException(message=f"Không tìm thấy món ăn: {', '.join(map(str, missing))}.")
    unavailable = [dish_id for dish_id in dish_ids if not by_id[dish_id].is_available]
    if unavailable:
        raise ConflictException(
            message="Món ăn đã ngừng kinh doanh.",
            code="DISH_UNAVAILABLE",
            details={"dish_ids": unavailable},
        )
    return by_id


def _price_items(requested: list[tuple[int, int]], by_id: dict[int, Dish], order_lines=None, db=None) -> tuple[list[dict], Decimal]:
    priced_items: list[dict] = []
    subtotal = Decimal("0")
    lines = order_lines or [(dish_id, quantity, [], "medium") for dish_id, quantity in requested]
    topping_rows = db.query(DishTopping).filter(DishTopping.dish_id.in_([line[0] for line in lines])).all() if db and lines else []
    topping_prices = {(row.dish_id, row.name): Decimal(row.price) for row in topping_rows}
    for dish_id, quantity, toppings, size in lines:
        dish = by_id[dish_id]
        allowed = {name: price for (owner, name), price in topping_prices.items() if owner == dish_id}
        if any(name not in allowed for name in toppings):
            raise BadRequestException(message="Một hoặc nhiều topping không thuộc món đã chọn.")
        factor = {"small": Decimal("0.85"), "medium": Decimal("1"), "large": Decimal("1.15")}[size]
        base_price = Decimal(str(dish.price)) * factor
        topping_price = sum((allowed[name] for name in toppings), Decimal("0"))
        unit_price = (base_price + topping_price).quantize(Decimal("1"), rounding="ROUND_HALF_UP")
        line_total = unit_price * quantity
        subtotal += line_total
        priced_items.append({
            "dish": dish,
            "dish_id": dish_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "line_total": line_total,
            "toppings": toppings,
            "size": size,
        })
    return priced_items, subtotal


def _lock_and_check_wallet(
    db: Session, user_id: int, payment_method: str, total: Decimal
) -> WalletModel | None:
    if payment_method != "wallet":
        return None
    wallet = (
        db.query(WalletModel).filter(WalletModel.user_id == user_id).with_for_update().first()
    )
    if wallet is None or (wallet.status or "").strip().casefold() != "active":
        raise ConflictException(
            message="Ví điện tử chưa được tạo hoặc không hoạt động.", code="WALLET_UNAVAILABLE"
        )
    if Decimal(wallet.balance) < total:
        raise ConflictException(
            message="Số dư ví không đủ để thanh toán đơn hàng.",
            code="INSUFFICIENT_WALLET_BALANCE",
            details={"required": str(total), "balance": str(wallet.balance)},
        )
    return wallet


def _create_order_items(db: Session, order_id: int, priced_items: list[dict]) -> list[OrderItem]:
    order_items: list[OrderItem] = []
    for priced in priced_items:
        dish = priced["dish"]
        toppings = priced.get("toppings") or []
        size_label = {"small": "Nhỏ", "medium": "Vừa", "large": "Lớn"}.get(priced.get("size"), "Vừa")
        item = OrderItem(
            order_id=order_id,
            dish_id=dish.id,
            item_code=f"dish-{dish.id}",
            item_name=(f"{dish.name} · {size_label}" + (f" · {', '.join(toppings)}" if toppings else ""))[:120],
            unit_price=priced["unit_price"],
            quantity=priced["quantity"],
            line_total=priced["line_total"],
        )
        db.add(item)
        order_items.append(item)
    db.flush()
    return order_items


def _deduct_ingredients(
    requested: list[tuple],
    recipe_rows: list[DishIngredient],
    locked_ingredients: dict[int, Ingredient],
) -> None:
    for ingredient_id, required in _ingredient_requirements(requested, recipe_rows).items():
        ingredient = locked_ingredients[ingredient_id]
        if ingredient.stock_quantity is not None:
            ingredient.stock_quantity = Decimal(ingredient.stock_quantity) - required


def _normalize_items(items: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not items:
        raise BadRequestException(message="Đơn hàng phải có ít nhất một món.")
    merged: dict[int, int] = {}
    for dish_id, quantity in items:
        if dish_id <= 0 or quantity <= 0:
            raise BadRequestException(message="Mã món và số lượng không hợp lệ.")
        merged[dish_id] = merged.get(dish_id, 0) + quantity
        if merged[dish_id] > 10:
            raise BadRequestException(
                message="Tổng số lượng của mỗi món không được vượt quá 10.",
                details={"code": "INVALID_QUANTITY", "dish_id": dish_id},
            )
    return sorted(merged.items())


def _request_hash(pickup_date, slot_id, items, delivery_address, note, payment_method, coupon_code, order_lines=None) -> str:
    payload = {
        "pickup_date": pickup_date.isoformat(),
        "pickup_slot_id": slot_id,
        "items": items,
        "delivery_address": (delivery_address or "").strip(),
        "note": (note or "").strip(),
        "payment_method": payment_method,
        "coupon_code": (coupon_code or "").strip().upper(),
    }
    if order_lines and any(toppings or size != "medium" for _, _, toppings, size in order_lines):
        payload["options"] = order_lines
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


def _find_idempotent_order(db: Session, key: str):
    return (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.idempotency_key == key)
        .first()
    )


def _replay_or_conflict(order: Order, user_id: int, request_hash: str) -> dict:
    if order.user_id != user_id or order.request_hash != request_hash:
        raise ConflictException(
            message="Idempotency-Key đã được dùng cho một yêu cầu khác.",
            code="IDEMPOTENCY_KEY_REUSED",
        )
    subtotal = Decimal(order.total_amount) + Decimal(order.discount_amount or 0)
    return _order_response(order, list(order.items), subtotal)


def _lock_and_check_ingredients(db: Session, items, order_lines=None):
    dish_ids = [dish_id for dish_id, _ in items]
    recipe_rows = (
        db.query(DishIngredient)
        .filter(DishIngredient.Dish_ID.in_(dish_ids))
        .order_by(DishIngredient.Ingredient_ID, DishIngredient.Dish_ID)
        .with_for_update()
        .all()
    )
    ingredient_ids = sorted({row.Ingredient_ID for row in recipe_rows})
    ingredients = (
        db.query(Ingredient)
        .filter(Ingredient.Ingredient_ID.in_(ingredient_ids))
        .order_by(Ingredient.Ingredient_ID)
        .with_for_update()
        .all()
    ) if ingredient_ids else []
    by_id = {row.Ingredient_ID: row for row in ingredients}
    requirements = _ingredient_requirements(order_lines or items, recipe_rows)
    for ingredient_id, required in requirements.items():
        ingredient = by_id.get(ingredient_id)
        if ingredient is None or not ingredient.is_active:
            raise ConflictException(
                message="Công thức có nguyên liệu không còn hoạt động.",
                code="INGREDIENT_UNAVAILABLE",
                details={"ingredient_id": ingredient_id},
            )
        if ingredient.stock_quantity is None:
            raise ConflictException(
                message="Chưa cấu hình tồn kho cho nguyên liệu trong công thức.",
                code="INGREDIENT_STOCK_UNCONFIGURED",
                details={"ingredient_id": ingredient_id, "ingredient_name": ingredient.Ingredient_Name},
            )
        if Decimal(ingredient.stock_quantity) < required:
            raise ConflictException(
                message="Tồn kho nguyên liệu không đủ.",
                code="INSUFFICIENT_INGREDIENTS",
                details={
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient.Ingredient_Name,
                    "required": str(required),
                    "remaining": str(ingredient.stock_quantity),
                },
            )
    return recipe_rows, by_id


def _ingredient_requirements(items, recipe_rows) -> dict[int, Decimal]:
    quantities: dict[int, Decimal] = {}
    if items and len(items[0]) > 2:
        for dish_id, quantity, _toppings, size in items:
            factor = {"small": Decimal("0.85"), "medium": Decimal("1"), "large": Decimal("1.15")}[size]
            quantities[dish_id] = quantities.get(dish_id, Decimal("0")) + Decimal(quantity) * factor
    else:
        quantities = {dish_id: Decimal(quantity) for dish_id, quantity in items}
    totals: dict[int, Decimal] = {}
    for row in recipe_rows:
        totals[row.Ingredient_ID] = totals.get(row.Ingredient_ID, Decimal("0")) + (
            Decimal(row.Quantity) * quantities.get(row.Dish_ID, 0)
        )
    return totals


def _save_recipe_snapshots(db: Session, order_items, recipe_rows, priced_items=None) -> None:
    by_dish: dict[int, list[DishIngredient]] = {}
    for row in recipe_rows:
        by_dish.setdefault(row.Dish_ID, []).append(row)
    paired_items = zip(order_items, priced_items or [{}] * len(order_items))
    for order_item, priced in paired_items:
        size = priced.get("size", "medium")
        factor = {"small": Decimal("0.85"), "medium": Decimal("1"), "large": Decimal("1.15")}[size]
        for recipe in by_dish.get(order_item.dish_id, []):
            ingredient = db.get(Ingredient, recipe.Ingredient_ID)
            if ingredient is None:
                continue
            db.add(
                OrderItemIngredientSnapshot(
                    order_item_id=order_item.id,
                    ingredient_id=ingredient.Ingredient_ID,
                    ingredient_name=ingredient.Ingredient_Name,
                    unit=ingredient.Unit,
                    quantity_per_serving=Decimal(recipe.Quantity) * factor,
                    required_quantity=Decimal(recipe.Quantity) * factor * order_item.quantity,
                )
            )


def _order_response(order: Order, items: list[OrderItem], subtotal: Decimal) -> dict:
    return {
        "order_id": order.id,
        "order_code": order.code,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "subtotal": subtotal,
        "discount": Decimal(order.discount_amount or 0),
        "total_amount": Decimal(order.total_amount),
        "pickup_date": order.pickup_date,
        "pickup_slot_id": order.pickup_slot_id,
        "delivery_address": order.delivery_address,
        "items": [
            {
                "dish_id": item.dish_id,
                "quantity": item.quantity,
                "unit_price": Decimal(item.unit_price),
                "line_total": Decimal(item.line_total),
            }
            for item in items
        ],
    }
