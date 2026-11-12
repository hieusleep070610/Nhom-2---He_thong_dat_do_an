from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.wallet import Wallet
from app.models.transactions import Transaction
from app.schemas.wallet import WalletCreate

def get_wallet_by_id(db: Session, wallet_id: int):
    return db.query(Wallet).filter(Wallet.id == wallet_id).first()

def get_wallet_by_user_id(db: Session, user_id: int):
    return db.query(Wallet).filter(Wallet.user_id == user_id).first()

def create_wallet(db: Session, wallet_in: WalletCreate):
    if wallet_in.balance < 0 or wallet_in.xu < 0:
        raise HTTPException(status_code=400, detail="Số dư hoặc số xu không được nhỏ hơn 0")
    
    db_wallet = Wallet(
        user_id=wallet_in.user_id,
        balance=wallet_in.balance,
        xu=wallet_in.xu,
        status=wallet_in.status
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet

def update_wallet(db: Session, wallet_id: int, balance: int = None, xu: int = None, status: str = None):
    wallet = get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví để cập nhật")
    
    if balance is not None:
        if balance < 0:
            raise HTTPException(status_code=400, detail="Số dư ví không được âm")
        wallet.balance = balance
    if xu is not None:
        if xu < 0:
            raise HTTPException(status_code=400, detail="Số xu không được âm")
        wallet.xu = xu
    if status is not None:
        wallet.status = status
        
    db.commit()
    db.refresh(wallet)
    return wallet

def process_payment(db: Session, wallet_id: int, amount: int, order_id: int = None):
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).with_for_update().first()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví điện tử.")
    
    if wallet.status != 'active':
        raise HTTPException(status_code=400, detail="Ví điện tử đang bị khóa.")

    if wallet.balance < amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Số dư không đủ! Hiện có: {wallet.balance:,} ₫, cần thanh toán: {amount:,} ₫."
        )

    wallet.balance -= amount

    new_txn = Transaction(
        wallet_id=wallet.id,
        type_transaction='payment',
        amount_money=-amount
    )
    db.add(new_txn)
    
    db.commit()
    db.refresh(wallet)
    return wallet