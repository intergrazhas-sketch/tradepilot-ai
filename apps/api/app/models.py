import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, ForeignKey, Text, JSON, Boolean
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

    listing_title = Column(String, nullable=True)
    listing_description = Column(Text, nullable=True)
    listing_bullets = Column(JSON, nullable=True)
    listing_keywords = Column(JSON, nullable=True)
    listing_status = Column(String, default="draft")
    listing_score = Column(Integer, default=0)
    listing_notes = Column(Text, nullable=True)
    last_listing_generated_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    supplier = relationship("Supplier", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=gen_id)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    quantity = Column(Integer, default=1)

    customer_name = Column(String, nullable=False, default="")
    customer_phone = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)
    customer_note = Column(Text, nullable=True)

    selling_price = Column(Float, default=0)
    cost_price = Column(Float, default=0)
    gross_profit = Column(Float, default=0)
    margin_percent = Column(Float, default=0)

    total_amount = Column(Float, default=0)
    cost_amount = Column(Float, default=0)
    profit_amount = Column(Float, default=0)

    status = Column(String, default="new")
    # new, confirmed, supplier_ordered, delivered, cancelled (+ legacy values)

    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    product = relationship("Product", foreign_keys=[product_id])
    supplier = relationship("Supplier", foreign_keys=[supplier_id])


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


class SupplierLead(Base):
    __tablename__ = "supplier_leads"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    website_url = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    category = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)
    price_list_url = Column(String, nullable=True)
    has_open_price_list = Column(Boolean, default=False)
    has_wholesale_terms = Column(Boolean, default=False)
    min_order_quantity = Column(Integer, nullable=True)
    delivery_info = Column(Text, nullable=True)
    source = Column(String, default="manual")
    search_request_id = Column(String, ForeignKey("supplier_search_requests.id"), nullable=True)
    notes = Column(Text, nullable=True)
    discovery_status = Column(String, default="new")
    supplier_fit_score = Column(Integer, default=0)
    supplier_fit_reason = Column(Text, nullable=True)
    converted_supplier_id = Column(String, ForeignKey("suppliers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    converted_supplier = relationship("Supplier", foreign_keys=[converted_supplier_id])
    search_request = relationship("SupplierSearchRequest", back_populates="leads")
    trend_products = relationship("TrendProductLead", back_populates="supplier_lead")


class SupplierSearchRequest(Base):
    __tablename__ = "supplier_search_requests"

    id = Column(String, primary_key=True, default=gen_id)
    category = Column(String, nullable=False)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    language = Column(String, default="ru")
    search_goal = Column(String, nullable=True)
    required_open_price_list = Column(Boolean, default=True)
    required_wholesale = Column(Boolean, default=True)
    min_score = Column(Integer, default=50)
    status = Column(String, default="draft")
    generated_queries = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    leads = relationship("SupplierLead", back_populates="search_request")
    web_results = relationship("SupplierSearchResult", back_populates="search_request")


class SupplierSearchResult(Base):
    __tablename__ = "supplier_search_results"

    id = Column(String, primary_key=True, default=gen_id)
    search_request_id = Column(String, ForeignKey("supplier_search_requests.id"), nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    snippet = Column(Text, nullable=True)
    source = Column(String, default="serpapi")
    query = Column(String, nullable=False)
    rank = Column(Integer, default=1)
    extracted_name = Column(String, nullable=True)
    possible_price_list = Column(Boolean, default=False)
    possible_wholesale = Column(Boolean, default=False)
    possible_contacts = Column(Boolean, default=False)
    result_score = Column(Integer, default=0)
    converted_lead_id = Column(String, ForeignKey("supplier_leads.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    search_request = relationship("SupplierSearchRequest", back_populates="web_results")
    converted_lead = relationship("SupplierLead", foreign_keys=[converted_lead_id])


class TrendProductLead(Base):
    __tablename__ = "trend_product_leads"

    id = Column(String, primary_key=True, default=gen_id)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    source = Column(String, default="manual")
    trend_score = Column(Integer, default=50)
    demand_reason = Column(Text, nullable=True)
    suggested_supplier_lead_id = Column(String, ForeignKey("supplier_leads.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    supplier_lead = relationship("SupplierLead", back_populates="trend_products")
