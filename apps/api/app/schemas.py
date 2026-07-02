from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict, model_validator

from app.services.pricing import calc_gross_profit, calc_markup_percent, calc_margin_percent


# ---------- Supplier ----------

class SupplierBase(BaseModel):
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: str = "active"
    notes: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SupplierOut(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


# ---------- Product ----------

class ProductBase(BaseModel):
    supplier_id: Optional[str] = None
    sku: Optional[str] = None
    name_raw: str
    name_ai: Optional[str] = None
    description_raw: Optional[str] = None
    description_ai: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    cost_price: float = 0
    selling_price: float = 0
    markup_percent: float = 0
    stock_quantity: int = 0
    currency: str = "KZT"
    status: str = "draft"
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    supplier_id: Optional[str] = None
    sku: Optional[str] = None
    name_raw: Optional[str] = None
    name_ai: Optional[str] = None
    description_raw: Optional[str] = None
    description_ai: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    markup_percent: Optional[float] = None
    stock_quantity: Optional[int] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    image_url: Optional[str] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    gross_profit: float = 0
    margin_percent: float = 0

    @model_validator(mode="after")
    def compute_profit_fields(self):
        cost = self.cost_price or 0
        sell = self.selling_price or 0
        self.gross_profit = calc_gross_profit(cost, sell)
        self.markup_percent = calc_markup_percent(cost, sell)
        self.margin_percent = calc_margin_percent(cost, sell)
        return self


# ---------- Product Import ----------

class ProductImportPreviewRow(BaseModel):
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    cost_price: float = 0
    stock_quantity: int = 0
    currency: str = "KZT"
    image_url: Optional[str] = None
    suggested_selling_price: float = 0
    row_status: str = "error"  # new | update | error
    valid: bool = True
    error: Optional[str] = None


class ProductImportPreviewResponse(BaseModel):
    rows: list[ProductImportPreviewRow]
    total_rows: int
    valid_rows: int
    invalid_rows: int
    new_rows: int = 0
    update_rows: int = 0
    error_rows: int = 0


class ProductImportCommitRequest(BaseModel):
    supplier_id: str
    rows: list[ProductImportPreviewRow]


class ProductImportCommitDetailRow(BaseModel):
    sku: Optional[str] = None
    name: str
    action: str  # added | updated | skipped | error
    product_id: Optional[str] = None
    error: Optional[str] = None


class ProductImportCommitResponse(BaseModel):
    added_count: int
    updated_count: int
    skipped_count: int
    error_count: int
    product_ids: list[str]
    rows: list[ProductImportCommitDetailRow]


# ---------- Order ----------

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = 1


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str
    quantity: int
    cost_price: float
    selling_price: float
    profit_amount: float


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    items: list[OrderItemCreate]


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    total_amount: float
    cost_amount: float
    profit_amount: float
    status: str
    created_at: datetime
    items: list[OrderItemOut] = []


# ---------- AI ----------

class AIProductRequest(BaseModel):
    product_id: str


class AITitleResult(BaseModel):
    before: str
    after: str


class AIDescriptionResult(BaseModel):
    before: Optional[str] = None
    after: str


class AICategoryResult(BaseModel):
    suggested_category: str
    confidence: float


class AIPriceResult(BaseModel):
    cost_price: float
    recommended_price: float
    markup_percent: float
    margin_percent: float
    explanation: str


class AIFullOptimizeResult(BaseModel):
    title: AITitleResult
    description: AIDescriptionResult
    category: AICategoryResult
    price: AIPriceResult


# ---------- Dashboard / Analytics ----------

class DashboardSummary(BaseModel):
    total_products: int
    active_products: int
    total_suppliers: int
    total_orders: int
    revenue: float
    profit: float
    average_margin_percent: float
    low_stock_products: int
    recent_orders: list[OrderOut]
    ai_recommendations: list[str]


class ProfitAnalytics(BaseModel):
    revenue: float
    cost: float
    profit: float
    average_margin_percent: float
    top_profit_products: list[dict[str, Any]]
    low_margin_products: list[dict[str, Any]]


class RecommendationsResponse(BaseModel):
    recommendations: list[str]


# ---------- Channels ----------

class ChannelBase(BaseModel):
    name: str
    type: str
    status: str = "not_connected"
    config_json: dict = {}


class ChannelCreate(ChannelBase):
    pass


class ChannelUpdate(BaseModel):
    status: Optional[str] = None
    config_json: Optional[dict] = None


class ChannelOut(ChannelBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------- Settings ----------

class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    language: str
    currency: str
    default_markup_percent: float
    plan: str
    company_name: str


class SettingsUpdate(BaseModel):
    language: Optional[str] = None
    currency: Optional[str] = None
    default_markup_percent: Optional[float] = None
    plan: Optional[str] = None
    company_name: Optional[str] = None
