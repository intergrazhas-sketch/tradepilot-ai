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
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  total_amount: number;
  cost_amount: number;
  profit_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
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
  product_ids: string[];
  rows: ImportCommitDetailRow[];
}

export const ORDER_STATUSES = [
  "new",
  "sent_to_supplier",
  "confirmed",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
