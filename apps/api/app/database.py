from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    """Lightweight SQLite migrations for MVP columns added after first deploy."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "products" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    with engine.begin() as conn:
        if "test_status" not in cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN test_status VARCHAR DEFAULT 'none'"))

    if "orders" not in insp.get_table_names():
        return
    order_cols = {c["name"] for c in insp.get_columns("orders")}
    order_migrations = {
        "product_id": "ALTER TABLE orders ADD COLUMN product_id VARCHAR",
        "supplier_id": "ALTER TABLE orders ADD COLUMN supplier_id VARCHAR",
        "quantity": "ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1",
        "customer_note": "ALTER TABLE orders ADD COLUMN customer_note TEXT",
        "selling_price": "ALTER TABLE orders ADD COLUMN selling_price FLOAT DEFAULT 0",
        "cost_price": "ALTER TABLE orders ADD COLUMN cost_price FLOAT DEFAULT 0",
        "gross_profit": "ALTER TABLE orders ADD COLUMN gross_profit FLOAT DEFAULT 0",
        "margin_percent": "ALTER TABLE orders ADD COLUMN margin_percent FLOAT DEFAULT 0",
    }
    with engine.begin() as conn:
        for col, sql in order_migrations.items():
            if col not in order_cols:
                conn.execute(text(sql))

    if "supplier_leads" in insp.get_table_names():
        lead_cols = {c["name"] for c in insp.get_columns("supplier_leads")}
        with engine.begin() as conn:
            if "search_request_id" not in lead_cols:
                conn.execute(text("ALTER TABLE supplier_leads ADD COLUMN search_request_id VARCHAR"))
