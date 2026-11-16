from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.wallet import WalletModel, WalletTransactionModel
from app.models.user import User
from app.schemas.wallet import WalletCreate

def get_wallet_by_id(db: Session, wallet_id: int):
    return db.query(WalletModel).filter(WalletModel.id == wallet_id).first()

def get_wallet_by_user_id(db: Session, user_id: int):
    return db.query(WalletModel).filter(WalletModel.user_id == user_id).first()

def create_wallet(db: Session, wallet_in: WalletCreate):
    user_exists = db.query(User).filter(User.id == wallet_in.user_id).first()
    if not user_exists:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy người dùng (User ID: {wallet_in.user_id}) trong hệ thống để tạo ví!"
        )

    existing_wallet = db.query(WalletModel).filter(WalletModel.user_id == wallet_in.user_id).first()
    if existing_wallet:
        raise HTTPException(
            status_code=400,
            detail=f"Người dùng với ID {wallet_in.user_id} đã sở hữu một ví rồi!"
        )
    
    db_wallet = WalletModel(
        user_id=wallet_in.user_id,
        balance=wallet_in.initial_balance,
        status="active"
    )
    db.add(db_wallet)
    db.commit()
    db.refresh(db_wallet)
    return db_wallet

def update_wallet(db: Session, wallet_id: int, balance: int = None, status: str = None):
    wallet = get_wallet_by_id(db, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Không tìm thấy ví để cập nhật")
    
    if balance is not None:
        if balance < 0:
            raise HTTPException(status_code=400, detail="Số dư ví không được âm")
        wallet.balance = balance
    if status is not None:
        wallet.status = status
        
    db.commit()
    db.refresh(wallet)
    return wallet

def process_payment(db: Session, wallet_id: int, amount: int, order_id: int = None):
    wallet = db.query(WalletModel).filter(WalletModel.id == wallet_id).with_for_update().first()
    
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

    new_txn = WalletTransactionModel(
        wallet_id=wallet.id,
        type_transaction='payment',
        amount_money=-amount
    )
    db.add(new_txn)
    
    db.commit()
    db.refresh(wallet)
    return wallet
