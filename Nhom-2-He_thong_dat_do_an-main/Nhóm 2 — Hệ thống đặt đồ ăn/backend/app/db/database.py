from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Thay đổi tài khoản/mật khẩu và tên database của bạn tại đây:
# Cú pháp: mysql+pymysql://<user>:<password>@<host>:<port>/<dbname>
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:123456$@localhost:3306/food_ordering_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Hàm lấy phiên làm việc với database
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()