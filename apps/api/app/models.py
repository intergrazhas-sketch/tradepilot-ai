import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, default="owner")  # owner, admin, manager
    plan = Column(String, default="free")  # free, starter, pro, business
    created_at = Column(DateTime, default=datetime.utcnow)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    status = Column(String, default="active")  # active, paused, archived
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="supplier", cascade="all, delete-orphan")


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=gen_id)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)

    sku = Column(String, nullable=True)
    name_raw = Column(String, nullable=False)
    name_ai = Column(String, nullable=True)
    description_raw = Column(Text, nullable=True)
    description_ai = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    brand = Column(String, nullable=True)

    cost_price = Column(Float, default=0)
    selling_price = Column(Float, default=0)
    markup_percent = Column(Float, default=0)

    stock_quantity = Column(Integer, default=0)
    currency = Column(String, default="KZT")
    status = Column(String, default="draft")  # draft, active, archived
    test_status = Column(String, default="none")  # none, candidate, testing, rejected
    image_url = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=gen_id)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)

    total_amount = Column(Float, default=0)
    cost_amount = Column(Float, default=0)
    profit_amount = Column(Float, default=0)

    status = Column(String, default="new")
    # new, sent_to_supplier, confirmed, shipped, completed, cancelled

    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=gen_id)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, default=1)
    cost_price = Column(Float, default=0)
    selling_price = Column(Float, default=0)
    profit_amount = Column(Float, default=0)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class MarketplaceChannel(Base):
    __tablename__ = "marketplace_channels"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # marketplace, social, custom_api
    status = Column(String, default="not_connected")  # not_connected, planned, connected
    config_json = Column(JSON, default=dict)


class AIJob(Base):
    __tablename__ = "ai_jobs"

    id = Column(String, primary_key=True, default=gen_id)
    type = Column(String, nullable=False)
    status = Column(String, default="completed")  # queued, running, completed, failed
    input_json = Column(JSON, default=dict)
    output_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlatformSettings(Base):
    """Single-row table holding workspace-level settings for the MVP."""
    __tablename__ = "platform_settings"

    id = Column(String, primary_key=True, default=lambda: "default")
    language = Column(String, default="ru")  # ru, kz, en
    currency = Column(String, default="KZT")
    default_markup_percent = Column(Float, default=35.0)
    plan = Column(String, default="free")
    company_name = Column(String, default="My Store")
