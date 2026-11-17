from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.db import get_db
from app.schemas.wallet import WalletCreate, WalletResponse, PaymentRequest
from app.services.wallet_service import get_wallet_by_id, create_wallet, process_payment

router_wallet = APIRouter(prefix="/wallets", tags=["Wallet"])

@router_wallet.post("/", response_model=WalletResponse, status_code=201)
def create_new_wallet(wallet_in: WalletCreate, db: Session = Depends(get_db)):
    return create_wallet(db, wallet_in=wallet_in)

@router_wallet.post("/pay")
def pay_order(data: PaymentRequest, db: Session = Depends(get_db)):
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
def get_wallet(wallet_id: int, db: Session = Depends(get_db)):
    db_wallet = get_wallet_by_id(db, wallet_id=wallet_id)
    if not db_wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã ví này!")
    return db_wallet