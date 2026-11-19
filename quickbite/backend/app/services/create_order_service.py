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

_LOCAL_TIMEZONE = timezone(timedelta(hours=7))


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
    """Create and pay for an order atomically using the customer's wallet."""
    requested = _normalize_items(items)
    request_hash = _request_hash(
        pickup_date, pickup_slot_id, requested, note, payment_method, coupon_code
    )
    if idempotency_key:
        prior = _find_idempotent_order(db, idempotency_key)
        if prior:
            return _replay_or_conflict(prior, customer.user_id, request_hash)

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
        # The repository does not contain a coupon model or validation service.
        raise BadRequestException(
            message="Mã giảm giá không hợp lệ.",
            details={"code": "INVALID_COUPON"},
        )
    if payment_method != "wallet":
        raise BadRequestException(
            message="Phương thức thanh toán hiện được hỗ trợ là wallet.",
            details={"code": "UNSUPPORTED_PAYMENT_METHOD"},
        )

    try:
        serving_count = sum(quantity for _, quantity in requested)
        reserve_slot_servings(db, pickup_slot_id, pickup_date, serving_count)

        dish_ids = [dish_id for dish_id, _ in requested]
        dishes = (
            db.query(Dish)
            .filter(Dish.id.in_(dish_ids))
            .order_by(Dish.id)
            .with_for_update()
            .all()
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

        ensure_servings_available(db, pickup_date, requested, lock=True)
        recipe_rows, locked_ingredients = _lock_and_check_ingredients(db, requested)

        priced_items: list[dict] = []
        subtotal = Decimal("0")
        for dish_id, quantity in requested:
            dish = by_id[dish_id]
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

        discount = Decimal("0")
        total = max(Decimal("0"), subtotal - discount)
        wallet = (
            db.query(WalletModel)
            .filter(WalletModel.user_id == customer.user_id)
            .with_for_update()
            .first()
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

        order = Order(
            code=f"FD{pickup_date:%Y%m%d}{secrets.token_hex(3).upper()}",
            customer_name=customer.full_name,
            customer_phone=phone,
            user_id=customer.user_id,
            note=(note or "").strip() or None,
            pickup_date=pickup_date,
            pickup_slot_id=pickup_slot_id,
            status="confirmed",
            payment_method="wallet",
            payment_status="paid",
            discount_amount=discount,
            total_amount=total,
            idempotency_key=idempotency_key,
            request_hash=request_hash if idempotency_key else None,
        )
        db.add(order)
        db.flush()

        order_items: list[OrderItem] = []
        for priced in priced_items:
            dish = priced["dish"]
            order_item = OrderItem(
                order_id=order.id,
                dish_id=dish.id,
                item_code=f"dish-{dish.id}",
                item_name=dish.name,
                unit_price=priced["unit_price"],
                quantity=priced["quantity"],
                line_total=priced["line_total"],
            )
            db.add(order_item)
            order_items.append(order_item)
        db.flush()

        _save_recipe_snapshots(db, order_items, recipe_rows)
        for ingredient_id, required in _ingredient_requirements(requested, recipe_rows).items():
            ingredient = locked_ingredients[ingredient_id]
            if ingredient.stock_quantity is not None:
                ingredient.stock_quantity = Decimal(ingredient.stock_quantity) - required

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
        if idempotency_key:
            prior = _find_idempotent_order(db, idempotency_key)
            if prior:
                return _replay_or_conflict(prior, customer.user_id, request_hash)
        raise ConflictException(
            message="Không thể tạo đơn do dữ liệu bị trùng hoặc thay đổi đồng thời.",
            code="ORDER_CONFLICT",
        ) from error
    except Exception:
        db.rollback()
        raise


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


def _request_hash(pickup_date, slot_id, items, note, payment_method, coupon_code) -> str:
    payload = {
        "pickup_date": pickup_date.isoformat(),
        "pickup_slot_id": slot_id,
        "items": items,
        "note": (note or "").strip(),
        "payment_method": payment_method,
        "coupon_code": (coupon_code or "").strip().upper(),
    }
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


def _lock_and_check_ingredients(db: Session, items):
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
    requirements = _ingredient_requirements(items, recipe_rows)
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
    quantities = dict(items)
    totals: dict[int, Decimal] = {}
    for row in recipe_rows:
        totals[row.Ingredient_ID] = totals.get(row.Ingredient_ID, Decimal("0")) + (
            Decimal(row.Quantity) * quantities.get(row.Dish_ID, 0)
        )
    return totals


def _save_recipe_snapshots(db: Session, order_items, recipe_rows) -> None:
    by_dish: dict[int, list[DishIngredient]] = {}
    for row in recipe_rows:
        by_dish.setdefault(row.Dish_ID, []).append(row)
    for order_item in order_items:
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
                    quantity_per_serving=Decimal(recipe.Quantity),
                    required_quantity=Decimal(recipe.Quantity) * order_item.quantity,
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
