"""Số suất còn lại của từng món theo ngày.

Định mức lấy từ daily_menus.quantity. Suất đã giữ là tổng quantity
của order_items thuộc đơn cùng ngày nhận và chưa hủy.
"""

from __future__ import annotations

import re
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.food import DailyMenu, Dish
from app.models.order import Order
from app.models.order_item import OrderItem

_DISH_CODE = re.compile(r"^(?:dish[-_])?(\d+)$", re.IGNORECASE)


def get_remaining_by_date(
    db: Session,
    menu_date: date,
    dish_id: int | None = None,
    dish_ids: set[int] | None = None,
    *,
    lock: bool = False,
) -> list[dict]:
    """Số suất còn lại của các món có trong thực đơn ngày menu_date.

    lock=True giữ hàng daily_menus đến hết transaction, dùng khi kiểm tra
    rồi tạo đơn trong cùng một session.
    """
    selected = set(dish_ids or ())
    if dish_id is not None:
        selected.add(dish_id)

    query = (
        db.query(DailyMenu, Dish)
        .join(Dish, Dish.id == DailyMenu.dish_id)
        .filter(DailyMenu.menu_date == menu_date)
    )
    if selected:
        query = query.filter(DailyMenu.dish_id.in_(selected))
    if lock:
        query = query.order_by(DailyMenu.dish_id, DailyMenu.id).with_for_update()

    planned: dict[int, dict] = {}
    for menu, dish in query.all():
        bucket = planned.setdefault(
            dish.id,
            {
                "dish_id": dish.id,
                "dish_name": dish.name,
                "planned_quantity": 0,
                "is_available": bool(dish.is_available),
            },
        )
        bucket["planned_quantity"] += int(menu.quantity or 0)
        bucket["is_available"] = bool(dish.is_available)

    ordered = _ordered_quantities(db, menu_date, set(planned))
    rows = []
    for dish_key, bucket in planned.items():
        used = ordered.get(dish_key, 0)
        remaining = max(bucket["planned_quantity"] - used, 0)
        rows.append(
            {
                **bucket,
                "ordered_quantity": used,
                "remaining_quantity": remaining,
            }
        )
    rows.sort(key=lambda row: (row["dish_name"], row["dish_id"]))
    return rows


def check_servings_before_order(
    db: Session,
    menu_date: date,
    items: list[tuple[int, int]],
    *,
    lock: bool = True,
) -> dict:
    """Đối chiếu số suất muốn đặt với phần còn lại trong ngày.

    Trả về báo cáo từng món. Không ghi đơn. Gọi hàm này trong cùng
    transaction với lúc tạo đơn và giữ lock=True để tránh đặt vượt suất.
    """
    requested = _merge_requested(items)
    dishes = db.query(Dish).filter(Dish.id.in_(requested)).all()
    found = {dish.id: dish for dish in dishes}
    missing = [dish_key for dish_key in requested if dish_key not in found]
    if missing:
        joined = ", ".join(str(dish_key) for dish_key in missing)
        raise NotFoundException(message=f"Không tìm thấy món ăn: {joined}")

    stock = {
        row["dish_id"]: row
        for row in get_remaining_by_date(
            db,
            menu_date,
            dish_ids=set(requested),
            lock=lock,
        )
    }

    report = []
    for dish_key, quantity in requested.items():
        dish = found[dish_key]
        row = stock.get(dish_key)
        if row is None:
            report.append(
                {
                    "dish_id": dish.id,
                    "dish_name": dish.name,
                    "planned_quantity": 0,
                    "ordered_quantity": 0,
                    "remaining_quantity": 0,
                    "requested_quantity": quantity,
                    "enough": False,
                    "is_available": bool(dish.is_available),
                    "message": "Món không có trong thực đơn ngày này.",
                }
            )
            continue

        if not row["is_available"]:
            message = "Món đã ngừng bán."
            enough = False
        elif quantity <= row["remaining_quantity"]:
            message = "Đủ suất."
            enough = True
        else:
            message = f"Chỉ còn {row['remaining_quantity']} suất."
            enough = False

        report.append(
            {
                **row,
                "requested_quantity": quantity,
                "enough": enough,
                "message": message,
            }
        )

    report.sort(key=lambda row: (row["dish_name"], row["dish_id"]))
    return {
        "menu_date": menu_date.isoformat(),
        "can_order": all(row["enough"] for row in report),
        "dishes": report,
    }


def ensure_servings_available(
    db: Session,
    menu_date: date,
    items: list[tuple[int, int]],
    *,
    lock: bool = True,
) -> dict:
    """Chặn đặt món khi một món không còn đủ suất trong ngày."""
    report = check_servings_before_order(db, menu_date, items, lock=lock)
    if not report["can_order"]:
        raise ConflictException(
            message="Một số món không còn đủ suất trong ngày đã chọn.",
            code="INSUFFICIENT_SERVINGS",
            details=report,
        )
    return report


def _merge_requested(items: list[tuple[int, int]]) -> dict[int, int]:
    if not items:
        raise BadRequestException(message="Danh sách món cần kiểm tra đang trống.")

    requested: dict[int, int] = {}
    for dish_id, quantity in items:
        if dish_id <= 0:
            raise BadRequestException(message="Mã món không hợp lệ.")
        if quantity < 1:
            raise BadRequestException(message="Số lượng mỗi món phải từ 1 trở lên.")
        requested[dish_id] = requested.get(dish_id, 0) + quantity
    return requested


def _ordered_quantities(db: Session, menu_date: date, dish_ids: set[int]) -> dict[int, int]:
    if not dish_ids:
        return {}

    dishes = db.query(Dish).filter(Dish.id.in_(dish_ids)).all()
    by_id = {dish.id: dish.id for dish in dishes}
    by_code = {str(dish.id): dish.id for dish in dishes}
    by_name = {dish.name.strip().casefold(): dish.id for dish in dishes}

    rows = (
        db.query(
            OrderItem.item_code,
            OrderItem.item_name,
            func.coalesce(func.sum(OrderItem.quantity), 0),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.pickup_date == menu_date, Order.status != "cancelled")
        .group_by(OrderItem.item_code, OrderItem.item_name)
        .all()
    )

    totals = {dish_id: 0 for dish_id in dish_ids}
    for item_code, item_name, quantity in rows:
        matched = _match_dish(item_code, item_name, by_id, by_code, by_name)
        if matched in totals:
            totals[matched] += int(quantity or 0)
    return totals


def _match_dish(
    item_code: str | None,
    item_name: str | None,
    by_id: dict[int, int],
    by_code: dict[str, int],
    by_name: dict[str, int],
) -> int | None:
    code = (item_code or "").strip()
    if code in by_code:
        return by_code[code]

    coded = _DISH_CODE.fullmatch(code)
    if coded is not None:
        dish_id = int(coded.group(1))
        if dish_id in by_id:
            return dish_id

    for label in (item_name, code):
        key = (label or "").strip().casefold()
        if key in by_name:
            return by_name[key]
    return None
