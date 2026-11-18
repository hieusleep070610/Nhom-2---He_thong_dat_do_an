from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.wallet import WalletCreate, WalletResponse, PaymentRequest
from app.services.wallet_service import get_wallet_by_id, create_wallet, process_payment
from app.core.exceptions import unified_success_response

router_wallet = APIRouter(prefix="/wallets", tags=["Wallet"])

@router_wallet.post("/", response_model=WalletResponse, status_code=201)
def create_new_wallet(wallet_in: WalletCreate, db: Session = Depends(get_db)):
    wallet = create_wallet(db, wallet_in=wallet_in)
    return unified_success_response(
        status_code=201,
        message="Tạo ví thành công",
        data=wallet,
    )

@router_wallet.post("/pay")
def pay_order(data: PaymentRequest, db: Session = Depends(get_db)):
    updated_wallet = process_payment(
        db,
        wallet_id=data.wallet_id,
        order_id=data.order_id,
    )
    return unified_success_response(
        message="Thanh toán thành công!",
        data={"new_balance": updated_wallet.balance},
    )

@router_wallet.get("/{wallet_id}", response_model=WalletResponse)
def get_wallet(wallet_id: int, db: Session = Depends(get_db)):
    db_wallet = get_wallet_by_id(db, wallet_id=wallet_id)
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã ví này!")
    return unified_success_response(message="Lấy thông tin ví thành công", data=db_wallet)