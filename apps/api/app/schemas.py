from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict, model_validator

from app.services.pricing import calc_gross_profit, calc_markup_percent, calc_margin_percent
from app.services.decision_service import evaluate_product_decision


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
    test_status: str = "none"
    image_url: Optional[str] = None
    listing_title: Optional[str] = None
    listing_description: Optional[str] = None
    listing_bullets: Optional[list[str]] = None
    listing_keywords: Optional[list[str]] = None
    listing_status: str = "draft"
    listing_score: int = 0
    listing_notes: Optional[str] = None
    last_listing_generated_at: Optional[datetime] = None
    test_launch_status: str = "not_selected"


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
    test_status: Optional[str] = None
    image_url: Optional[str] = None


class ProductTestStatusUpdate(BaseModel):
    test_status: str  # none | candidate | testing | rejected


class ProductListingUpdate(BaseModel):
    listing_title: Optional[str] = None
    listing_description: Optional[str] = None
    listing_bullets: Optional[list[str]] = None
    listing_keywords: Optional[list[str]] = None
    listing_status: Optional[str] = None
    listing_notes: Optional[str] = None


class ProductListingOut(BaseModel):
    product_id: str
    listing_title: Optional[str] = None
    listing_description: Optional[str] = None
    listing_bullets: list[str] = []
    listing_keywords: list[str] = []
    listing_status: str = "draft"
    listing_score: int = 0
    listing_notes: Optional[str] = None
    last_listing_generated_at: Optional[datetime] = None


class ProductListingGenerateResponse(BaseModel):
    product: "ProductOut"
    generated_with: str


class ListingSummary(BaseModel):
    ready: int
    needs_review: int
    draft: int


class TestLaunchStatusUpdate(BaseModel):
    test_launch_status: str


class TestLaunchSummary(BaseModel):
    total_candidates: int
    selected_count: int
    in_progress_count: int
    completed_count: int
    total_expected_profit: float
    average_margin_percent: float


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    gross_profit: float = 0
    margin_percent: float = 0
    decision_status: str = "bad"
    decision_score: float = 0
    decision_reason: str = ""

    @model_validator(mode="after")
    def compute_profit_fields(self):
        cost = self.cost_price or 0
        sell = self.selling_price or 0
        stock = self.stock_quantity or 0
        self.gross_profit = calc_gross_profit(cost, sell)
        self.markup_percent = calc_markup_percent(cost, sell)
        self.margin_percent = calc_margin_percent(cost, sell)
        status, score, reason = evaluate_product_decision(
            cost, sell, stock, self.markup_percent
        )
        self.decision_status = status
        self.decision_score = score
        self.decision_reason = reason
        return self


class TestLaunchProductOut(ProductOut):
    supplier_name: Optional[str] = None


class LaunchControlChecklistItem(BaseModel):
    key: str
    title: str
    status: str
    count: int
    action_label: str
    action_href: str


class LaunchControlSummary(BaseModel):
    suppliers_count: int
    products_count: int
    good_products_count: int
    ready_listings_count: int
    test_candidates_count: int
    selected_for_test_count: int
    active_orders_count: int
    total_expected_profit: float
    average_margin_percent: float
    checklist: list[LaunchControlChecklistItem]
    checklist_done: int
    checklist_warning: int
    checklist_missing: int


class LaunchControlIssue(BaseModel):
    key: str
    title: str
    count: int
    action_label: str
    action_href: str


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
    good_count: int = 0
    risk_count: int = 0
    bad_count: int = 0
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


class ManualOrderCreate(BaseModel):
    product_id: str
    quantity: int = 1
    customer_name: Optional[str] = ""
    customer_phone: Optional[str] = None
    customer_note: Optional[str] = None
    selling_price: Optional[float] = None


class OrderStatusUpdate(BaseModel):
    status: str


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
    product_id: Optional[str] = None
    supplier_id: Optional[str] = None
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    supplier_name: Optional[str] = None
    quantity: int = 1
    customer_name: str = ""
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_note: Optional[str] = None
    selling_price: float = 0
    cost_price: float = 0
    gross_profit: float = 0
    margin_percent: float = 0
    total_amount: float
    cost_amount: float
    profit_amount: float
    status: str
    created_at: datetime
    items: list[OrderItemOut] = []


class OrdersSummary(BaseModel):
    total_orders: int
    new_orders: int
    confirmed_orders: int
    supplier_ordered_orders: int
    delivered_orders: int
    cancelled_orders: int
    total_revenue: float
    total_cost: float = 0
    total_profit: float
    average_margin_percent: float


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


class WorkflowHints(BaseModel):
    primary_message: str
    secondary_messages: list[str] = []
    total_products: int = 0
    good_products: int = 0
    risk_products: int = 0
    bad_products: int = 0
    has_import_issues: bool = False


class ProfitAnalytics(BaseModel):
    revenue: float
    cost: float
    profit: float
    average_margin_percent: float
    top_profit_products: list[dict[str, Any]]
    low_margin_products: list[dict[str, Any]]


class AnalyticsSummary(BaseModel):
    total_products: int
    good_products: int
    risk_products: int
    bad_products: int
    total_potential_profit: float
    average_margin_percent: float
    average_markup_percent: float
    top_products_by_profit: list[dict[str, Any]]
    top_products_by_margin: list[dict[str, Any]]
    low_margin_products: list[dict[str, Any]]
    out_of_stock_products: list[dict[str, Any]]


class SupplierAnalyticsItem(BaseModel):
    supplier_id: str
    supplier_name: str
    products_count: int
    good_count: int
    risk_count: int
    bad_count: int
    average_margin_percent: float
    total_potential_profit: float
    supplier_score: float


class RecommendationsResponse(BaseModel):
    recommendations: list[str]


# ---------- Supplier Discovery ----------

class SupplierLeadBase(BaseModel):
    name: str
    website_url: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    whatsapp: Optional[str] = None
    price_list_url: Optional[str] = None
    has_open_price_list: bool = False
    has_wholesale_terms: bool = False
    min_order_quantity: Optional[int] = None
    delivery_info: Optional[str] = None
    source: str = "manual"
    notes: Optional[str] = None


class SupplierLeadCreate(SupplierLeadBase):
    pass


class SupplierLeadUpdate(BaseModel):
    name: Optional[str] = None
    website_url: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    whatsapp: Optional[str] = None
    price_list_url: Optional[str] = None
    has_open_price_list: Optional[bool] = None
    has_wholesale_terms: Optional[bool] = None
    min_order_quantity: Optional[int] = None
    delivery_info: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    discovery_status: Optional[str] = None


class SupplierLeadOut(SupplierLeadBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    discovery_status: str
    supplier_fit_score: int
    supplier_fit_reason: Optional[str] = None
    converted_supplier_id: Optional[str] = None
    created_at: datetime


class SupplierDiscoverySummary(BaseModel):
    total_leads: int
    open_price_leads: int
    high_fit_leads: int
    new_leads: int
    trend_product_ideas: int


class ConvertLeadResponse(BaseModel):
    lead: SupplierLeadOut
    supplier: SupplierOut


# ---------- Supplier Search ----------

class SupplierSearchRequestBase(BaseModel):
    category: str
    country: Optional[str] = None
    city: Optional[str] = None
    language: str = "ru"
    search_goal: Optional[str] = None
    required_open_price_list: bool = True
    required_wholesale: bool = True
    min_score: int = 50
    notes: Optional[str] = None


class SupplierSearchRequestCreate(SupplierSearchRequestBase):
    pass


class SupplierSearchRequestOut(SupplierSearchRequestBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    status: str
    generated_queries: Optional[list[str]] = None
    created_at: datetime


class SupplierSearchResultCreate(BaseModel):
    name: str
    website_url: Optional[str] = None
    source_url: Optional[str] = None
    category: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    whatsapp: Optional[str] = None
    price_list_url: Optional[str] = None
    has_wholesale_terms: bool = False
    delivery_info: Optional[str] = None
    min_order_quantity: Optional[int] = None
    notes: Optional[str] = None


class SupplierSearchAddResultResponse(BaseModel):
    lead: SupplierLeadOut
    request: SupplierSearchRequestOut


class SupplierSearchSummary(BaseModel):
    total_requests: int
    ready_requests: int
    generated_queries_count: int
    leads_created_from_search: int
    high_fit_leads: int


class SupplierSearchProviderStatus(BaseModel):
    configured: bool
    provider: str
    message: str


class SupplierSearchWebResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    search_request_id: str
    title: str
    url: str
    snippet: Optional[str] = None
    source: str
    query: str
    rank: int
    extracted_name: Optional[str] = None
    possible_price_list: bool
    possible_wholesale: bool
    possible_contacts: bool
    result_score: int
    converted_lead_id: Optional[str] = None
    created_at: datetime


class SupplierSearchLiveRunResponse(BaseModel):
    configured: bool
    provider: str
    message: str
    queries_run: int
    results: list[SupplierSearchWebResultOut]


class SupplierSearchConvertResultResponse(BaseModel):
    result: SupplierSearchWebResultOut
    lead: SupplierLeadOut


# ---------- Trend Products ----------

class TrendProductLeadBase(BaseModel):
    title: str
    category: Optional[str] = None
    source: str = "manual"
    trend_score: int = 50
    demand_reason: Optional[str] = None
    suggested_supplier_lead_id: Optional[str] = None
    notes: Optional[str] = None


class TrendProductLeadCreate(TrendProductLeadBase):
    pass


class TrendProductLeadOut(TrendProductLeadBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    supplier_lead_name: Optional[str] = None
    created_at: datetime


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
