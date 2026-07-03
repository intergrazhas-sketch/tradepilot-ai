export interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  city?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  supplier_id?: string | null;
  sku?: string | null;
  name_raw: string;
  name_ai?: string | null;
  description_raw?: string | null;
  description_ai?: string | null;
  category?: string | null;
  brand?: string | null;
  cost_price: number;
  selling_price: number;
  markup_percent: number;
  margin_percent: number;
  gross_profit: number;
  decision_status: "good" | "risk" | "bad";
  decision_score: number;
  decision_reason: string;
  test_status: "none" | "candidate" | "testing" | "rejected";
  stock_quantity: number;
  currency: string;
  status: string;
  image_url?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  profit_amount: number;
}

export interface Order {
  id: string;
  product_id?: string | null;
  supplier_id?: string | null;
  product_name?: string | null;
  product_sku?: string | null;
  supplier_name?: string | null;
  quantity: number;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_note?: string | null;
  selling_price: number;
  cost_price: number;
  gross_profit: number;
  margin_percent: number;
  total_amount: number;
  cost_amount: number;
  profit_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrdersSummary {
  total_orders: number;
  new_orders: number;
  confirmed_orders: number;
  supplier_ordered_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_cost?: number;
  total_profit: number;
  average_margin_percent: number;
}

export interface ManualOrderCreate {
  product_id: string;
  quantity: number;
  customer_name?: string;
  customer_phone?: string;
  customer_note?: string;
  selling_price?: number;
}

export interface DashboardSummary {
  total_products: number;
  active_products: number;
  total_suppliers: number;
  total_orders: number;
  revenue: number;
  profit: number;
  average_margin_percent: number;
  low_stock_products: number;
  recent_orders: Order[];
  ai_recommendations: string[];
}

export interface ProfitAnalytics {
  revenue: number;
  cost: number;
  profit: number;
  average_margin_percent: number;
  top_profit_products: Array<{ id: string; name: string; margin_percent: number; selling_price: number; cost_price: number }>;
  low_margin_products: Array<{ id: string; name: string; margin_percent: number; selling_price: number; cost_price: number }>;
}

export interface Channel {
  id: string;
  name: string;
  type: string;
  status: string;
  config_json: Record<string, unknown>;
}

export interface PlatformSettings {
  language: string;
  currency: string;
  default_markup_percent: number;
  plan: string;
  company_name: string;
}

export interface WorkflowHints {
  primary_message: string;
  secondary_messages: string[];
  total_products: number;
  good_products: number;
  risk_products: number;
  bad_products: number;
  has_import_issues: boolean;
}

export interface ImportPreviewRow {
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  cost_price: number;
  stock_quantity: number;
  currency: string;
  image_url?: string | null;
  suggested_selling_price: number;
  row_status: "new" | "update" | "error";
  valid: boolean;
  error?: string | null;
}

export interface ImportPreviewResponse {
  rows: ImportPreviewRow[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  new_rows: number;
  update_rows: number;
  error_rows: number;
}

export interface ImportCommitDetailRow {
  sku?: string | null;
  name: string;
  action: "added" | "updated" | "skipped" | "error";
  product_id?: string | null;
  error?: string | null;
}

export interface ImportCommitResponse {
  added_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  good_count: number;
  risk_count: number;
  bad_count: number;
  product_ids: string[];
  rows: ImportCommitDetailRow[];
}

export interface AnalyticsProductSnapshot {
  id: string;
  name: string;
  sku?: string | null;
  cost_price: number;
  selling_price: number;
  gross_profit: number;
  margin_percent: number;
  markup_percent: number;
  stock_quantity: number;
  decision_status: "good" | "risk" | "bad";
  decision_score: number;
  decision_reason: string;
}

export interface AnalyticsSummary {
  total_products: number;
  good_products: number;
  risk_products: number;
  bad_products: number;
  total_potential_profit: number;
  average_margin_percent: number;
  average_markup_percent: number;
  top_products_by_profit: AnalyticsProductSnapshot[];
  top_products_by_margin: AnalyticsProductSnapshot[];
  low_margin_products: AnalyticsProductSnapshot[];
  out_of_stock_products: AnalyticsProductSnapshot[];
}

export interface SupplierAnalyticsItem {
  supplier_id: string;
  supplier_name: string;
  products_count: number;
  good_count: number;
  risk_count: number;
  bad_count: number;
  average_margin_percent: number;
  total_potential_profit: number;
  supplier_score: number;
}

export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "supplier_ordered",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface SupplierLead {
  id: string;
  name: string;
  website_url?: string | null;
  country?: string | null;
  city?: string | null;
  category?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  whatsapp?: string | null;
  price_list_url?: string | null;
  has_open_price_list: boolean;
  has_wholesale_terms: boolean;
  min_order_quantity?: number | null;
  delivery_info?: string | null;
  source: string;
  notes?: string | null;
  discovery_status: "new" | "reviewed" | "added_to_suppliers" | "rejected";
  supplier_fit_score: number;
  supplier_fit_reason?: string | null;
  converted_supplier_id?: string | null;
  created_at: string;
}

export interface SupplierDiscoverySummary {
  total_leads: number;
  open_price_leads: number;
  high_fit_leads: number;
  new_leads: number;
  trend_product_ideas: number;
}

export interface TrendProductLead {
  id: string;
  title: string;
  category?: string | null;
  source: string;
  trend_score: number;
  demand_reason?: string | null;
  suggested_supplier_lead_id?: string | null;
  supplier_lead_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export type SupplierLeadFilter = "all" | "open_price" | "wholesale" | "high_score" | "new" | "rejected";
