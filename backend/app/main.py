from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.core.exceptions import setup_exception_handlers
from app.database.db import init_db
from app.routers import auth_router, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        print(f"[DB] Đã kết nối MySQL {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    except OperationalError as error:
        print("[DB] KHÔNG kết nối được MySQL! Kiểm tra MySQL đã bật chưa và file .env.")
        print(f"[DB] Chi tiết: {error.orig}")
    except Exception as error:  # noqa: BLE001
        print("[DB] KHÔNG kết nối được MySQL! Kiểm tra MySQL đã bật chưa và file .env.")
        print(f"[DB] Chi tiết: {error}")
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)
setup_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth_router.router, prefix="/api")


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} đang chạy. Xem tài liệu API tại /docs"}
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.db import init_db

from app.routers.auth_router import router as auth_router
from app.routers.health import router as health_router


app = FastAPI(
    title="QuickBite API",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup():

    init_db()


app.include_router(
    auth_router,
    prefix="/api"
)

app.include_router(
    health_router,
    prefix="/api"
)


@app.get("/")
def home():

    return {
        "message": "QuickBite API is running"
    }