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