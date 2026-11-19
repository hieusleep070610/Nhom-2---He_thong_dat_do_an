from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.ingredient import Ingredient
from app.models.order_item import OrderItem
from app.models.order_item_ingredient_snapshot import OrderItemIngredientSnapshot


def restore_order_ingredient_stock(db: Session, order_id: int) -> None:
    """Restore tracked ingredient balances from immutable order snapshots."""
    snapshots = (
        db.query(OrderItemIngredientSnapshot)
        .join(OrderItem, OrderItem.id == OrderItemIngredientSnapshot.order_item_id)
        .filter(OrderItem.order_id == order_id)
        .order_by(OrderItemIngredientSnapshot.ingredient_id)
        .all()
    )
    totals: dict[int, Decimal] = {}
    for snapshot in snapshots:
        if snapshot.ingredient_id is not None:
            totals[snapshot.ingredient_id] = totals.get(snapshot.ingredient_id, Decimal("0")) + Decimal(snapshot.required_quantity)
    if not totals:
        return
    ingredients = (
        db.query(Ingredient)
        .filter(Ingredient.Ingredient_ID.in_(sorted(totals)))
        .order_by(Ingredient.Ingredient_ID)
        .with_for_update()
        .all()
    )
    for ingredient in ingredients:
        if ingredient.stock_quantity is not None:
            ingredient.stock_quantity = Decimal(ingredient.stock_quantity) + totals[ingredient.Ingredient_ID]
