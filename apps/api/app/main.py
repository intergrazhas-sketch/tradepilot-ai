from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine, ensure_schema
from app.routers import (
    suppliers, products, ai, orders, dashboard, analytics, channels,
    settings as settings_router, supplier_discovery, trend_products, supplier_search,
)

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_schema()


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


app.include_router(dashboard.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(ai.router)
app.include_router(orders.router)
app.include_router(analytics.router)
app.include_router(channels.router)
app.include_router(settings_router.router)
app.include_router(supplier_discovery.router)
app.include_router(supplier_search.router)
app.include_router(trend_products.router)
