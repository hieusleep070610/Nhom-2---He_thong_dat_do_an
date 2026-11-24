from datetime import date, datetime, time, timedelta
from decimal import Decimal
import re

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.exceptions import BaseAPIException, ConflictException, NotFoundException
from app.database.db import Base
from app.models import (  # noqa: F401
    DailyMenu,
    Dish,
    DishIngredient,
    Ingredient,
    Order,
    OrderItem,
    OrderItemIngredientSnapshot,
    OrderStatusHistory,
    PickupSlot,
    Role,
    SlotDailyQuota,
    User,
    WalletModel,
    WalletTransactionModel,
)
from app.schemas.order import OrderCreate
from app.services.create_order_service import create_order
from app.services.wallet_service import process_payment


@pytest.fixture
def world():
    engine = create_engine("sqlite://")

    @event.listens_for(engine, "connect")
    def register_regexp(connection, _record):
        connection.create_function("regexp", 2, lambda pattern, value: bool(re.search(pattern, value or "")))

    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    customer = User(
        email="customer@example.com",
        phone="0901234567",
        password="hashed",
        full_name="Test Customer",
        address="12 Nguyễn Huệ, Quận 1",
    )
    slot = PickupSlot(
        label="18:00",
        start_time=time(18, 0),
        end_time=time(18, 30),
        max_servings=20,
        is_active=1,
    )
    dish1 = Dish(name="Com ga", price=Decimal("40000"), description="Test", is_available=True)
    dish2 = Dish(name="Pho bo", price=Decimal("55000"), description="Test", is_available=True)
    session.add_all([customer, slot, dish1, dish2])
    session.flush()
    pickup_date = date.today() + timedelta(days=1)
    session.add_all([
        DailyMenu(menu_date=pickup_date, dish_id=dish1.id, quantity=20),
        DailyMenu(menu_date=pickup_date, dish_id=dish2.id, quantity=20),
        WalletModel(user_id=customer.user_id, balance=Decimal("1000000"), status="active"),
    ])
    session.commit()
    yield {
        "db": session,
        "engine": engine,
        "customer": customer,
        "date": pickup_date,
        "dish1": dish1,
        "dish2": dish2,
        "slot": slot,
    }
    session.close()
    Base.metadata.drop_all(engine)
    engine.dispose()


def submit(world, items=((1, 1),), **overrides):
    args = {
        "db": world["db"],
        "customer": world["customer"],
        "pickup_date": world["date"],
        "pickup_slot_id": world["slot"].id,
        "items": list(items),
        "delivery_address": None,
        "note": None,
        "payment_method": "wallet",
        "coupon_code": None,
        "idempotency_key": None,
    }
    args.update(overrides)
    return create_order(**args)


def test_creates_wallet_paid_order_and_history(world):
    result = submit(world)
    assert result["status"] == "confirmed"
    assert result["payment_status"] == "paid"
    assert result["subtotal"] == Decimal("40000")
    assert result["delivery_address"] == world["customer"].address
    assert world["db"].query(Order).count() == 1
    assert world["db"].query(OrderStatusHistory).count() == 1


def test_explicit_delivery_address_is_saved_on_order(world):
    result = submit(world, delivery_address="99 Lê Lợi, Quận 1")
    assert result["delivery_address"] == "99 Lê Lợi, Quận 1"
    assert world["db"].query(Order).one().delivery_address == "99 Lê Lợi, Quận 1"


def test_order_requires_address_when_checkout_and_profile_are_blank(world):
    from app.core.exceptions import BadRequestException

    world["customer"].address = None
    world["db"].commit()
    with pytest.raises(BadRequestException) as error:
        submit(world)
    assert error.value.details["code"] == "CUSTOMER_ADDRESS_REQUIRED"
    assert world["db"].query(Order).count() == 0


def test_profile_address_can_be_updated(world):
    from app.routers.auth import update_me
    from app.schemas.user import UserAddressUpdate

    updated = update_me(
        UserAddressUpdate(address="45 Trần Hưng Đạo, Quận 1"),
        user=world["customer"],
        db=world["db"],
    )
    assert updated.address == "45 Trần Hưng Đạo, Quận 1"


def test_new_user_is_assigned_customer_role(world):
    from app.schemas.user import UserCreate
    from app.services.user_services import create_user

    user = create_user(world["db"], UserCreate(
        email="new-customer@example.com",
        full_name="New Customer",
        phone="0901111222",
        password="secure-pass-123",
    ))
    assert [(role.id, role.name) for role in user.roles] == [(3, "customer")]


def test_role_dependencies_allow_only_the_matching_staff_role():
    from fastapi import HTTPException
    from app.routers.auth import get_current_admin, get_current_kitchen_staff

    admin = User(email="admin@example.test", phone=None, password="x", full_name="Admin")
    admin.roles = [Role(id=1, name="admin", description="Admin")]
    kitchen = User(email="kitchen@example.test", phone=None, password="x", full_name="Kitchen")
    kitchen.roles = [Role(id=2, name="kitchen", description="Kitchen")]
    customer = User(email="role-customer@example.test", phone=None, password="x", full_name="Customer")
    customer.roles = [Role(id=3, name="customer", description="Customer")]

    assert get_current_admin(user=admin) is admin
    assert get_current_kitchen_staff(user=kitchen) is kitchen
    assert get_current_kitchen_staff(user=admin) is admin
    with pytest.raises(HTTPException) as error:
        get_current_admin(user=customer)
    assert error.value.status_code == 403
    with pytest.raises(HTTPException) as error:
        get_current_kitchen_staff(user=customer)
    assert error.value.status_code == 403


def test_startup_role_seed_assigns_fixed_roles_to_existing_users(world, monkeypatch):
    from app.core.config import settings
    from app.models.role import Role
    from app.services.role_service import seed_roles_and_assign_users

    kitchen = User(
        email="kitchen@example.com",
        phone="0901111223",
        password="x",
        full_name="Kitchen Staff",
    )
    world["db"].add(kitchen)
    world["db"].flush()
    monkeypatch.setattr(settings, "ADMIN_USER_IDS", str(world["customer"].user_id))
    monkeypatch.setattr(settings, "KITCHEN_USER_IDS", str(kitchen.user_id))

    seed_roles_and_assign_users(world["db"])

    assert [(role.id, role.name) for role in world["customer"].roles] == [(1, "admin")]
    assert [(role.id, role.name) for role in kitchen.roles] == [(2, "kitchen")]
    assert [(role.id, role.name) for role in world["db"].query(Role).order_by(Role.id).all()] == [
        (1, "admin"), (2, "kitchen"), (3, "customer")
    ]


def test_admin_can_assign_one_of_the_three_roles(world):
    from app.routers.auth import assign_user_role
    from app.schemas.user import UserRoleUpdate

    admin_role = Role(id=1, name="admin", description="Admin")
    kitchen_role = Role(id=2, name="kitchen", description="Kitchen")
    customer_role = Role(id=3, name="customer", description="Customer")
    world["db"].add_all([admin_role, kitchen_role, customer_role])
    admin = User(
        email="assigner@example.com",
        phone=None,
        password="x",
        full_name="Admin",
        roles=[admin_role],
    )
    world["db"].add(admin)
    world["db"].commit()

    response = assign_user_role(
        world["customer"].user_id,
        UserRoleUpdate(role_id=2),
        _admin=admin,
        db=world["db"],
    )
    assert response.role_id == 2
    assert response.role == "kitchen"
    assert response.roles == ["kitchen"]


def test_multiple_items_calculate_database_prices(world):
    result = submit(world, items=((world["dish1"].id, 2), (world["dish2"].id, 1)))
    assert result["subtotal"] == Decimal("135000")
    assert [item["line_total"] for item in result["items"]] == [Decimal("80000"), Decimal("55000")]


def test_missing_dish_returns_not_found(world):
    with pytest.raises(NotFoundException):
        submit(world, items=((99999, 1),))
    assert world["db"].query(Order).count() == 0


def test_dish_not_in_selected_daily_menu_conflicts(world):
    other = Dish(name="Not on menu", price=Decimal("10000"), is_available=True)
    world["db"].add(other)
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world, items=((other.id, 1),))
    assert error.value.details["code"] == "INSUFFICIENT_SERVINGS"


def test_request_schema_rejects_invalid_quantity_and_empty_items():
    with pytest.raises(Exception):
        OrderCreate(pickup_date=date.today(), pickup_slot_id=1, items=[])
    with pytest.raises(Exception):
        OrderCreate(pickup_date=date.today(), pickup_slot_id=1, items=[{"dish_id": 1, "quantity": 0}])


def test_unavailable_dish_is_rejected(world):
    world["dish1"].is_available = False
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "DISH_UNAVAILABLE"


def test_insufficient_daily_servings_is_rejected(world):
    menu = world["db"].query(DailyMenu).filter_by(dish_id=world["dish1"].id).first()
    menu.quantity = 0
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "INSUFFICIENT_SERVINGS"


def test_missing_pickup_slot_returns_not_found(world):
    with pytest.raises(NotFoundException):
        submit(world, pickup_slot_id=99999)


def test_inactive_pickup_slot_is_rejected(world):
    world["slot"].is_active = 0
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "SLOT_UNAVAILABLE"


def test_past_pickup_date_is_rejected(world):
    with pytest.raises(BaseAPIException):
        submit(world, pickup_date=date.today() - timedelta(days=1))


def test_full_pickup_slot_is_rejected(world):
    world["db"].add(SlotDailyQuota(
        pickup_slot_id=world["slot"].id,
        service_date=world["date"],
        max_servings=20,
        booked_servings=20,
    ))
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "SLOT_FULL"


def test_recipe_stock_shortage_rolls_back_order_and_quota(world):
    ingredient = Ingredient(
        Ingredient_Name="Rice", Unit="g", min_stock=0, stock_quantity=Decimal("100"), is_active=True
    )
    world["db"].add(ingredient)
    world["db"].flush()
    world["db"].add(DishIngredient(Dish_ID=world["dish1"].id, Ingredient_ID=ingredient.Ingredient_ID, Quantity=Decimal("200")))
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "INSUFFICIENT_INGREDIENTS"
    assert world["db"].query(Order).count() == 0
    assert world["db"].query(SlotDailyQuota).count() == 0


def test_recipe_snapshots_aggregate_shared_ingredient_and_decrement_stock(world):
    ingredient = Ingredient(
        Ingredient_Name="Rice", Unit="g", min_stock=0, stock_quantity=Decimal("1000"), is_active=True
    )
    world["db"].add(ingredient)
    world["db"].flush()
    world["db"].add_all([
        DishIngredient(Dish_ID=world["dish1"].id, Ingredient_ID=ingredient.Ingredient_ID, Quantity=Decimal("200")),
        DishIngredient(Dish_ID=world["dish2"].id, Ingredient_ID=ingredient.Ingredient_ID, Quantity=Decimal("100")),
    ])
    world["db"].commit()
    submit(world, items=((world["dish1"].id, 2), (world["dish2"].id, 1)))
    assert ingredient.stock_quantity == Decimal("500.000")
    assert world["db"].query(OrderItemIngredientSnapshot).count() == 2


def test_coupon_is_rejected_when_coupon_module_is_absent(world):
    with pytest.raises(BaseAPIException) as error:
        submit(world, coupon_code="FOODIE10")
    assert error.value.details["code"] == "INVALID_COUPON"


def test_missing_wallet_is_rejected(world):
    wallet = world["db"].query(WalletModel).first()
    world["db"].delete(wallet)
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "WALLET_UNAVAILABLE"


def test_insufficient_wallet_does_not_create_order_or_reserve_slot(world):
    wallet = world["db"].query(WalletModel).first()
    wallet.balance = Decimal("1")
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "INSUFFICIENT_WALLET_BALANCE"
    assert world["db"].query(Order).count() == 0
    assert world["db"].query(SlotDailyQuota).count() == 0


def test_wallet_is_charged_once_for_idempotent_request(world):
    before = Decimal(world["db"].query(WalletModel).first().balance)
    first = submit(world, idempotency_key="request-001")
    second = submit(world, idempotency_key="request-001")
    assert first["order_id"] == second["order_id"]
    assert world["db"].query(Order).count() == 1
    assert world["db"].query(WalletTransactionModel).count() == 1
    assert Decimal(world["db"].query(WalletModel).first().balance) == before - Decimal("40000")


def test_online_payment_is_not_falsely_marked_paid(world):
    with pytest.raises(BaseAPIException) as error:
        submit(world, payment_method="online")
    assert error.value.details["code"] == "UNSUPPORTED_PAYMENT_METHOD"
    assert world["db"].query(Order).count() == 0


def test_reused_idempotency_key_for_different_request_conflicts(world):
    submit(world, idempotency_key="request-002")
    with pytest.raises(ConflictException) as error:
        submit(world, items=((world["dish1"].id, 2),), idempotency_key="request-002")
    assert error.value.details["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_duplicate_dish_lines_are_merged(world):
    result = submit(world, items=((world["dish1"].id, 1), (world["dish1"].id, 2)))
    assert len(result["items"]) == 1
    assert result["items"][0]["quantity"] == 3
    assert result["subtotal"] == Decimal("120000")


def test_frontend_price_is_ignored_by_request_schema(world):
    request = OrderCreate.model_validate({
        "pickup_date": world["date"],
        "pickup_slot_id": world["slot"].id,
        "items": [{"dish_id": world["dish1"].id, "quantity": 1, "price": 1}],
    })
    result = submit(world, items=[(request.items[0].dish_id, request.items[0].quantity)])
    assert result["total_amount"] == Decimal("40000")


def test_unconfigured_recipe_stock_is_not_assumed_available(world):
    ingredient = Ingredient(Ingredient_Name="Chicken", Unit="g", min_stock=0, stock_quantity=None, is_active=True)
    world["db"].add(ingredient)
    world["db"].flush()
    world["db"].add(DishIngredient(Dish_ID=world["dish1"].id, Ingredient_ID=ingredient.Ingredient_ID, Quantity=Decimal("150")))
    world["db"].commit()
    with pytest.raises(ConflictException) as error:
        submit(world)
    assert error.value.details["code"] == "INGREDIENT_STOCK_UNCONFIGURED"


def test_cancelled_order_restores_wallet_quota_and_tracked_ingredients(world):
    ingredient = Ingredient(Ingredient_Name="Rice", Unit="g", min_stock=0, stock_quantity=Decimal("1000"), is_active=True)
    world["db"].add(ingredient)
    world["db"].flush()
    world["db"].add(DishIngredient(Dish_ID=world["dish1"].id, Ingredient_ID=ingredient.Ingredient_ID, Quantity=Decimal("200")))
    world["db"].commit()
    balance = Decimal(world["db"].query(WalletModel).first().balance)
    result = submit(world)
    order = world["db"].query(Order).filter_by(id=result["order_id"]).first()
    from app.services.order_service import update_order_status
    update_order_status(world["db"], order.id, "cancelled")
    assert Decimal(world["db"].query(WalletModel).first().balance) == balance
    assert ingredient.stock_quantity == Decimal("1000.000")
    assert world["db"].query(SlotDailyQuota).first().booked_servings == 0


def test_same_idempotency_key_from_another_user_is_rejected(world):
    submit(world, idempotency_key="request-003")
    other = User(email="other@example.test", phone="0909876543", password="hashed", full_name="Other")
    world["db"].add(other)
    world["db"].commit()
    with pytest.raises(ConflictException):
        create_order(
            world["db"], customer=other, pickup_date=world["date"], pickup_slot_id=world["slot"].id,
            items=[(world["dish1"].id, 1)], note=None, payment_method="wallet", coupon_code=None,
            idempotency_key="request-003",
        )


def test_wallet_payment_checks_owner_and_does_not_mark_order_completed(world):
    wallet = world["db"].query(WalletModel).filter_by(user_id=world["customer"].user_id).one()
    order = Order(
        code="LEGACY-PAY-001",
        customer_name=world["customer"].full_name,
        customer_phone=world["customer"].phone,
        user_id=world["customer"].user_id,
        pickup_date=world["date"],
        pickup_slot_id=world["slot"].id,
        status="confirmed",
        total_amount=Decimal("40000"),
    )
    world["db"].add(order)
    world["db"].commit()

    other = User(email="payer@example.test", phone="0909876543", password="hashed", full_name="Other")
    world["db"].add(other)
    world["db"].flush()
    foreign_wallet = WalletModel(user_id=other.user_id, balance=Decimal("100000"), status="active")
    world["db"].add(foreign_wallet)
    world["db"].commit()

    with pytest.raises(BaseAPIException):
        process_payment(world["db"], wallet_id=foreign_wallet.id, order_id=order.id)

    balance_before = Decimal(wallet.balance)
    process_payment(world["db"], wallet_id=wallet.id, order_id=order.id)
    world["db"].refresh(order)
    assert order.payment_status == "paid"
    assert order.status == "confirmed"
    assert Decimal(wallet.balance) == balance_before - Decimal("40000")


def test_failure_after_order_insert_rolls_back_everything(world, monkeypatch):
    import app.services.create_order_service as service

    balance = Decimal(world["db"].query(WalletModel).first().balance)

    def fail_snapshot_write(*_args, **_kwargs):
        raise RuntimeError("simulated mid-transaction failure")

    monkeypatch.setattr(service, "_save_recipe_snapshots", fail_snapshot_write)
    with pytest.raises(RuntimeError):
        submit(world)
    assert world["db"].query(Order).count() == 0
    assert world["db"].query(OrderItem).count() == 0
    assert world["db"].query(SlotDailyQuota).count() == 0
    assert Decimal(world["db"].query(WalletModel).first().balance) == balance
