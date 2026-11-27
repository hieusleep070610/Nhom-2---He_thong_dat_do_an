from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.routers.auth import get_current_kitchen_staff
from app.schemas.inventory import (
    AdjustStockRequest,
    AdjustStockResponse,
    InventoryItemResponse,
    RestockRequest,
    RestockResponse,
)
from app.services import ingredient_inventory_service

router = APIRouter(
    prefix="/ingredients",
    tags=["Ingredient Inventory"],
    dependencies=[Depends(get_current_kitchen_staff)],
)


@router.get("/inventory", response_model=list[InventoryItemResponse])
def get_inventory_list(
    low_stock_only: bool = Query(default=False, description="Chỉ lấy nguyên liệu tồn <= min_stock"),
    is_active: bool | None = Query(default=None, description="Lọc theo trạng thái hoạt động"),
    search: str | None = Query(default=None, description="Tìm theo tên nguyên liệu"),
    db: Session = Depends(get_db),
):
    return ingredient_inventory_service.list_inventory(
        db,
        low_stock_only=low_stock_only,
        is_active=is_active,
        search=search,
    )


@router.get("/low-stock", response_model=list[InventoryItemResponse])
def get_low_stock_alerts(
    is_active: bool | None = Query(default=True, description="Mặc định lọc nguyên liệu đang hoạt động"),
    db: Session = Depends(get_db),
):
    return ingredient_inventory_service.list_low_stock_ingredients(
        db,
        is_active=is_active,
    )


@router.post("/{ingredient_id}/restock", response_model=RestockResponse)
def restock_ingredient_endpoint(
    ingredient_id: int,
    payload: RestockRequest,
    db: Session = Depends(get_db),
):
    return ingredient_inventory_service.restock_ingredient(
        db,
        ingredient_id=ingredient_id,
        quantity=payload.quantity,
        note=payload.note,
    )


@router.post("/{ingredient_id}/adjust", response_model=AdjustStockResponse)
def adjust_ingredient_endpoint(
    ingredient_id: int,
    payload: AdjustStockRequest,
    db: Session = Depends(get_db),
):
    return ingredient_inventory_service.adjust_ingredient_stock(
        db,
        ingredient_id=ingredient_id,
        mode=payload.mode,
        quantity=payload.quantity,
        reason=payload.reason,
    )