from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.wallet import WalletCreate, WalletResponse, PaymentRequest
from app.models.order import Order
from app.services.wallet_service import (
    create_wallet,
    get_wallet_by_id,
    get_wallet_by_user_id,
    process_payment,
)
from app.routers.auth import get_current_user
from app.core.exceptions import NotFoundException

router_wallet = APIRouter(prefix="/wallets", tags=["Wallet"])


@router_wallet.get("/mine", response_model=WalletResponse)
def get_my_wallet(customer=Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = get_wallet_by_user_id(db, customer.user_id)
    if wallet is None:
        raise NotFoundException(message="Tài khoản chưa có ví điện tử.")
    return wallet

@router_wallet.post("/", response_model=WalletResponse, status_code=201)
def create_new_wallet(
    wallet_in: WalletCreate,
    customer=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if wallet_in.user_id != customer.user_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    return create_wallet(db, wallet_in=wallet_in)

@router_wallet.post("/pay")
def pay_order(
    data: PaymentRequest,
    customer=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = get_wallet_by_id(db, wallet_id=data.wallet_id)
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if (
        wallet is None
        or order is None
        or wallet.user_id != customer.user_id
        or order.user_id != customer.user_id
    ):
        raise HTTPException(status_code=404, detail="Không tìm thấy tài nguyên thanh toán.")
    updated_wallet = process_payment(
        db,
        wallet_id=data.wallet_id,
        order_id=data.order_id,
    )
    return {
        "status": "success",
        "message": "Thanh toán thành công!",
        "new_balance": updated_wallet.balance
    }

@router_wallet.get("/{wallet_id}", response_model=WalletResponse)
def get_wallet(
    wallet_id: int,
    customer=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_wallet = get_wallet_by_id(db, wallet_id=wallet_id)
    if not db_wallet or db_wallet.user_id != customer.user_id:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã ví này!")
    return db_wallet
