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

VIETNAM_TZ = timezone(timedelta(hours=7))
MAX_QUANTITY_PER_DISH = 10
PHONE_PATTERN = re.compile(r"0[0-9]{8,10}")


def create_order(
    db: Session,
    *,
    customer: User,
    pickup_date: date,
    pickup_slot_id: int,
    items: list[tuple[int, int]],
    note: str | None,
    payment_method: str,
    coupon_code: str | None,
    idempotency_key: str | None,
) -> dict:
    """Tạo và thanh toán đơn hàng bằng ví điện tử trong một transaction."""
    normalized_items = _normalize_and_merge_items(items)
    request_hash = _build_request_hash(
        pickup_date=pickup_date,
        pickup_slot_id=pickup_slot_id,
        items=normalized_items,
        note=note,
        payment_method=payment_method,
        coupon_code=coupon_code,
    )

    # 1. Kiểm tra idempotency trước khi thực hiện thay đổi dữ liệu
    if idempotency_key:
        existing_order = _find_order_by_idempotency_key(db, idempotency_key)
        if existing_order is not None:
            return _handle_idempotent_order(existing_order, customer.user_id, request_hash)

    # 2. Kiểm tra thông tin tài khoản, ngày nhận, mã giảm giá và phương thức thanh toán
    customer_phone = _validate_customer_phone(customer)
    _validate_order_request(
        pickup_date=pickup_date,
        payment_method=payment_method,
        coupon_code=coupon_code,
    )

    try:
        # 3. Giữ chỗ theo khung giờ và khóa danh sách món ăn để kiểm tra trạng thái
        total_servings = sum(quantity for _, quantity in normalized_items)
        reserve_slot_servings(db, pickup_slot_id, pickup_date, total_servings)

        dishes_by_id = _lock_and_validate_dishes(db, normalized_items)

        # 4. Kiểm tra suất món theo ngày và khóa/kiểm tra tồn kho nguyên liệu
        ensure_servings_available(db, pickup_date, normalized_items, lock=True)
        recipe_rows, ingredients_by_id = _lock_and_check_ingredients(db, normalized_items)

        # 5. Tính tiền đơn hàng và kiểm tra ví khách hàng
        priced_items, subtotal = _calculate_priced_items(normalized_items, dishes_by_id)
        discount_amount = Decimal("0")
        total_amount = max(Decimal("0"), subtotal - discount_amount)

        wallet = _lock_and_validate_wallet(db, customer.user_id, total_amount)

        # 6. Tạo bản ghi Order và OrderItem
        order = _create_order_record(
            db=db,
            customer=customer,
            phone=customer_phone,
            pickup_date=pickup_date,
            pickup_slot_id=pickup_slot_id,
            note=note,
            payment_method=payment_method,
            discount_amount=discount_amount,
            total_amount=total_amount,
            idempotency_key=idempotency_key,
            request_hash=request_hash if idempotency_key else None,
        )
        order_items = _create_order_items(db, order.id, priced_items)

        # 7. Lưu snapshot nguyên liệu và trừ tồn kho nguyên liệu
        _save_recipe_snapshots(db, order_items, recipe_rows, ingredients_by_id)
        _deduct_ingredient_stock(normalized_items, recipe_rows, ingredients_by_id)

        # 8. Trừ tiền ví, ghi giao dịch ví và ghi lịch sử trạng thái đơn hàng
        _debit_wallet_and_log_transaction(db, wallet, order.id, total_amount)
        _log_initial_order_status(db, order.id, customer.user_id)

        db.commit()
        db.refresh(order)
        return _build_order_response(order, order_items, subtotal)

    except IntegrityError as error:
        db.rollback()
        if idempotency_key:
            existing_order = _find_order_by_idempotency_key(db, idempotency_key)
            if existing_order is not None:
                return _handle_idempotent_order(existing_order, customer.user_id, request_hash)
        raise ConflictException(
            message="Không thể tạo đơn do dữ liệu bị trùng hoặc thay đổi đồng thời.",
            code="ORDER_CONFLICT",
        ) from error

    except Exception:
        db.rollback()
        raise


# ---------------------------------------------------------------------------
# Validate & Idempotency helpers
# ---------------------------------------------------------------------------

def _normalize_and_merge_items(items: list[tuple[int, int]]) -> list[tuple[int, int]]:
    if not items:
        raise BadRequestException(message="Đơn hàng phải có ít nhất một món.")

    merged_quantities: dict[int, int] = {}
    for dish_id, quantity in items:
        if dish_id <= 0 or quantity <= 0:
            raise BadRequestException(message="Mã món và số lượng không hợp lệ.")

        next_qty = merged_quantities.get(dish_id, 0) + quantity
        if next_qty > MAX_QUANTITY_PER_DISH:
            raise BadRequestException(
                message=f"Tổng số lượng của mỗi món không được vượt quá {MAX_QUANTITY_PER_DISH}.",
                details={"code": "INVALID_QUANTITY", "dish_id": dish_id},
            )
        merged_quantities[dish_id] = next_qty

    return sorted(merged_quantities.items())


def _build_request_hash(
    *,
    pickup_date: date,
    pickup_slot_id: int,
    items: list[tuple[int, int]],
    note: str | None,
    payment_method: str,
    coupon_code: str | None,
) -> str:
    payload = {
        "pickup_date": pickup_date.isoformat(),
        "pickup_slot_id": pickup_slot_id,
        "items": items,
        "note": (note or "").strip(),
        "payment_method": payment_method,
        "coupon_code": (coupon_code or "").strip().upper(),
    }
    serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


def _find_order_by_idempotency_key(db: Session, idempotency_key: str) -> Order | None:
    return (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.idempotency_key == idempotency_key)
        .first()
    )


def _handle_idempotent_order(order: Order, user_id: int, request_hash: str) -> dict:
    if order.user_id != user_id or order.request_hash != request_hash:
        raise ConflictException(
            message="Idempotency-Key đã được dùng cho một yêu cầu khác.",
            code="IDEMPOTENCY_KEY_REUSED",
        )
    subtotal = Decimal(order.total_amount) + Decimal(order.discount_amount or 0)
    return _build_order_response(order, list(order.items), subtotal)


def _validate_customer_phone(customer: User) -> str:
    phone = (customer.phone or "").strip()
    if not phone:
        raise BadRequestException(
            message="Tài khoản cần có số điện thoại trước khi đặt hàng.",
            details={"code": "CUSTOMER_PHONE_REQUIRED"},
        )
    if not PHONE_PATTERN.fullmatch(phone):
        raise BadRequestException(
            message="Tài khoản cần có số điện thoại hợp lệ trước khi đặt hàng.",
            details={"code": "INVALID_CUSTOMER_PHONE"},
        )
    return phone


def _validate_order_request(
    *,
    pickup_date: date,
    payment_method: str,
    coupon_code: str | None,
) -> None:
    today_vn = datetime.now(VIETNAM_TZ).date()
    if pickup_date < today_vn:
        raise BadRequestException(message="Ngày nhận món không được ở trong quá khứ.")

    if coupon_code and coupon_code.strip():
        raise BadRequestException(
            message="Mã giảm giá không hợp lệ.",
            details={"code": "INVALID_COUPON"},
        )

    if payment_method != "wallet":
        raise BadRequestException(
            message="Phương thức thanh toán hiện được hỗ trợ là wallet.",
            details={"code": "UNSUPPORTED_PAYMENT_METHOD"},
        )


# ---------------------------------------------------------------------------
# Dish, Ingredient & Wallet locking helpers
# ---------------------------------------------------------------------------

def _lock_and_validate_dishes(db: Session, items: list[tuple[int, int]]) -> dict[int, Dish]:
    dish_ids = [dish_id for dish_id, _ in items]
    dishes = (
        db.query(Dish)
        .filter(Dish.id.in_(dish_ids))
        .order_by(Dish.id)
        .with_for_update()
        .all()
    )
    dishes_by_id = {dish.id: dish for dish in dishes}

    missing_ids = sorted(set(dish_ids) - set(dishes_by_id))
    if missing_ids:
        raise NotFoundException(
            message=f"Không tìm thấy món ăn: {', '.join(map(str, missing_ids))}."
        )

    unavailable_ids = [dish_id for dish_id in dish_ids if not dishes_by_id[dish_id].is_available]
    if unavailable_ids:
        raise ConflictException(
            message="Món ăn đã ngừng kinh doanh.",
            code="DISH_UNAVAILABLE",
            details={"dish_ids": unavailable_ids},
        )

    return dishes_by_id


def _lock_and_check_ingredients(
    db: Session, items: list[tuple[int, int]]
) -> tuple[list[DishIngredient], dict[int, Ingredient]]:
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
        if ingredient_ids
        else []
    )
    ingredients_by_id = {row.Ingredient_ID: row for row in ingredients}

    required_by_ingredient = _calculate_ingredient_requirements(items, recipe_rows)
    for ingredient_id, required_qty in required_by_ingredient.items():
        ingredient = ingredients_by_id.get(ingredient_id)
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
                details={
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient.Ingredient_Name,
                },
            )
        if Decimal(ingredient.stock_quantity) < required_qty:
            raise ConflictException(
                message="Tồn kho nguyên liệu không đủ.",
                code="INSUFFICIENT_INGREDIENTS",
                details={
                    "ingredient_id": ingredient_id,
                    "ingredient_name": ingredient.Ingredient_Name,
                    "required": str(required_qty),
                    "remaining": str(ingredient.stock_quantity),
                },
            )

    return recipe_rows, ingredients_by_id


def _calculate_ingredient_requirements(
    items: list[tuple[int, int]], recipe_rows: list[DishIngredient]
) -> dict[int, Decimal]:
    quantities_by_dish = dict(items)
    totals: dict[int, Decimal] = {}
    for row in recipe_rows:
        dish_qty = quantities_by_dish.get(row.Dish_ID, 0)
        needed = Decimal(row.Quantity) * dish_qty
        totals[row.Ingredient_ID] = totals.get(row.Ingredient_ID, Decimal("0")) + needed
    return totals


def _lock_and_validate_wallet(
    db: Session, user_id: int, required_amount: Decimal
) -> WalletModel:
    wallet = (
        db.query(WalletModel)
        .filter(WalletModel.user_id == user_id)
        .with_for_update()
        .first()
    )
    if wallet is None or (wallet.status or "").strip().casefold() != "active":
        raise ConflictException(
            message="Ví điện tử chưa được tạo hoặc không hoạt động.",
            code="WALLET_UNAVAILABLE",
        )
    if Decimal(wallet.balance) < required_amount:
        raise ConflictException(
            message="Số dư ví không đủ để thanh toán đơn hàng.",
            code="INSUFFICIENT_WALLET_BALANCE",
            details={"required": str(required_amount), "balance": str(wallet.balance)},
        )
    return wallet


# ---------------------------------------------------------------------------
# Persistence & Response helpers
# ---------------------------------------------------------------------------

def _calculate_priced_items(
    items: list[tuple[int, int]], dishes_by_id: dict[int, Dish]
) -> tuple[list[dict], Decimal]:
    priced_items: list[dict] = []
    subtotal = Decimal("0")

    for dish_id, quantity in items:
        dish = dishes_by_id[dish_id]
        unit_price = Decimal(str(dish.price)).quantize(Decimal("1"))
        line_total = unit_price * quantity
        subtotal += line_total
        priced_items.append({
            "dish": dish,
            "dish_id": dish_id,
            "quantity": quantity,
            "unit_price": unit_price,
            "line_total": line_total,
        })

    return priced_items, subtotal


def _create_order_record(
    db: Session,
    *,
    customer: User,
    phone: str,
    pickup_date: date,
    pickup_slot_id: int,
    note: str | None,
    payment_method: str,
    discount_amount: Decimal,
    total_amount: Decimal,
    idempotency_key: str | None,
    request_hash: str | None,
) -> Order:
    order_code = f"FD{pickup_date:%Y%m%d}{secrets.token_hex(3).upper()}"
    order = Order(
        code=order_code,
        customer_name=customer.full_name,
        customer_phone=phone,
        user_id=customer.user_id,
        note=(note or "").strip() or None,
        pickup_date=pickup_date,
        pickup_slot_id=pickup_slot_id,
        status="confirmed",
        payment_method=payment_method,
        payment_status="paid",
        discount_amount=discount_amount,
        total_amount=total_amount,
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )
    db.add(order)
    db.flush()
    return order


def _create_order_items(
    db: Session, order_id: int, priced_items: list[dict]
) -> list[OrderItem]:
    order_items: list[OrderItem] = []
    for item in priced_items:
        dish = item["dish"]
        order_item = OrderItem(
            order_id=order_id,
            dish_id=dish.id,
            item_code=f"dish-{dish.id}",
            item_name=dish.name,
            unit_price=item["unit_price"],
            quantity=item["quantity"],
            line_total=item["line_total"],
        )
        db.add(order_item)
        order_items.append(order_item)
    db.flush()
    return order_items


def _save_recipe_snapshots(
    db: Session,
    order_items: list[OrderItem],
    recipe_rows: list[DishIngredient],
    ingredients_by_id: dict[int, Ingredient],
) -> None:
    recipes_by_dish: dict[int, list[DishIngredient]] = {}
    for row in recipe_rows:
        recipes_by_dish.setdefault(row.Dish_ID, []).append(row)

    for order_item in order_items:
        for recipe in recipes_by_dish.get(order_item.dish_id, []):
            ingredient = ingredients_by_id.get(recipe.Ingredient_ID) or db.get(
                Ingredient, recipe.Ingredient_ID
            )
            if ingredient is None:
                continue

            qty_per_serving = Decimal(recipe.Quantity)
            db.add(
                OrderItemIngredientSnapshot(
                    order_item_id=order_item.id,
                    ingredient_id=ingredient.Ingredient_ID,
                    ingredient_name=ingredient.Ingredient_Name,
                    unit=ingredient.Unit,
                    quantity_per_serving=qty_per_serving,
                    required_quantity=qty_per_serving * order_item.quantity,
                )
            )


def _deduct_ingredient_stock(
    items: list[tuple[int, int]],
    recipe_rows: list[DishIngredient],
    ingredients_by_id: dict[int, Ingredient],
) -> None:
    required_by_ingredient = _calculate_ingredient_requirements(items, recipe_rows)
    for ingredient_id, required_qty in required_by_ingredient.items():
        ingredient = ingredients_by_id[ingredient_id]
        if ingredient.stock_quantity is not None:
            ingredient.stock_quantity = Decimal(ingredient.stock_quantity) - required_qty


def _debit_wallet_and_log_transaction(
    db: Session, wallet: WalletModel, order_id: int, amount: Decimal
) -> None:
    wallet.balance = Decimal(wallet.balance) - amount
    db.add(
        WalletTransactionModel(
            wallet_id=wallet.id,
            type_transaction=payment_key(order_id),
            amount_money=-amount,
        )
    )


def _log_initial_order_status(db: Session, order_id: int, user_id: int) -> None:
    db.add(
        OrderStatusHistory(
            order_id=order_id,
            old_status=None,
            new_status="confirmed",
            changed_by=str(user_id),
        )
    )


def _build_order_response(order: Order, items: list[OrderItem], subtotal: Decimal) -> dict:
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