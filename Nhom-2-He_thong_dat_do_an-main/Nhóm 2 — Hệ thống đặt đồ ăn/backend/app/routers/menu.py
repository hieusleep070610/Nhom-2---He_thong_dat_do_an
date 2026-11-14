from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import literal, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.item import Item
from app.models.menu_models import MenuItem
from app.schemas.menu import DailyMenuItemOut, DailyMenuOut

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.get("", response_model=DailyMenuOut)
def get_daily_menu(
    date_value: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    menu_cols = [c.name for c in MenuItem.__table__.columns]

    total_qty_col = None
    if "total_qty" in menu_cols:
        total_qty_col = "total_qty"
    elif "quantity" in menu_cols:
        total_qty_col = "quantity"
    elif "remaining_qty" in menu_cols:
        total_qty_col = "remaining_qty"

    remaining_col = None
    if "remaining_qty" in menu_cols:
        remaining_col = "remaining_qty"
    elif total_qty_col is not None:
        remaining_col = total_qty_col

    if total_qty_col is None or remaining_col is None:
        rows = db.execute(
            select(
                Item.id.label("item_id"),
                Item.name,
                Item.price,
                literal(0).label("total_qty"),
                literal(0).label("remaining_qty"),
            )
            .order_by(Item.id)
        ).all()
    else:
        stmt = (
            select(
                Item.id.label("item_id"),
                Item.name,
                Item.price,
                getattr(MenuItem, total_qty_col).label("total_qty"),
                getattr(MenuItem, remaining_col).label("remaining_qty"),
            )
            .outerjoin(
                MenuItem,
                (MenuItem.item_id == Item.id) & (MenuItem.date == date_value),
            )
            .order_by(Item.id)
        )
        rows = db.execute(stmt).all()

    items = [
        DailyMenuItemOut(
            item_id=row.item_id,
            name=row.name,
            price=row.price,
            total_qty=max(int(row.total_qty), 0),
            remaining_qty=max(int(row.remaining_qty), 0),
        )
        for row in rows
    ]

    return {
        "date": date_value.isoformat(),
        "items": items,
    }