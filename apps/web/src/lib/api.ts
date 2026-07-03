const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

import type {
  Supplier, Product, Order, OrdersSummary, ManualOrderCreate, DashboardSummary, ProfitAnalytics,
  Channel, PlatformSettings, ImportPreviewResponse, ImportPreviewRow, ImportCommitResponse,
  AnalyticsSummary, SupplierAnalyticsItem, WorkflowHints,
  SupplierLead, SupplierDiscoverySummary, TrendProductLead, SupplierLeadFilter,
  SupplierSearchRequest, SupplierSearchSummary, SupplierSearchResultCreate,
} from "@/types";

export const api = {
  // Dashboard
  dashboardSummary: () => request<DashboardSummary>("/api/v1/dashboard/summary"),
  workflowHints: () => request<WorkflowHints>("/api/v1/dashboard/workflow"),

  // Suppliers
  listSuppliers: () => request<Supplier[]>("/api/v1/suppliers"),
  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>("/api/v1/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    request<Supplier>(`/api/v1/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (id: string) =>
    request<void>(`/api/v1/suppliers/${id}`, { method: "DELETE" }),

  // Products
  listProducts: (params?: { supplier_id?: string; category?: string; search?: string; decision_status?: string; test_status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.supplier_id) qs.set("supplier_id", params.supplier_id);
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.decision_status) qs.set("decision_status", params.decision_status);
    if (params?.test_status) qs.set("test_status", params.test_status);
    const query = qs.toString();
    return request<Product[]>(`/api/v1/products${query ? `?${query}` : ""}`);
  },
  listBestProducts: (sortBy: "score" | "profit" | "margin" = "score") =>
    request<Product[]>(`/api/v1/products/best?sort_by=${sortBy}`),
  updateTestStatus: (id: string, test_status: Product["test_status"]) =>
    request<Product>(`/api/v1/products/${id}/test-status`, {
      method: "PATCH",
      body: JSON.stringify({ test_status }),
    }),
  createProduct: (data: Partial<Product>) =>
    request<Product>("/api/v1/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    request<Product>(`/api/v1/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<void>(`/api/v1/products/${id}`, { method: "DELETE" }),

  // Import
  importPreview: (supplierId: string, file: File) => {
    const formData = new FormData();
    formData.append("supplier_id", supplierId);
    formData.append("file", file);
    return request<ImportPreviewResponse>("/api/v1/products/import-preview", {
      method: "POST",
      body: formData,
    });
  },
  importCommit: (supplierId: string, rows: ImportPreviewRow[]) =>
    request<ImportCommitResponse>("/api/v1/products/import-csv", {
      method: "POST",
      body: JSON.stringify({ supplier_id: supplierId, rows }),
    }),

  // AI
  aiImproveTitle: (productId: string) =>
    request<{ before: string; after: string }>("/api/v1/ai/products/improve-title", {
      method: "POST", body: JSON.stringify({ product_id: productId }),
    }),
  aiImproveDescription: (productId: string) =>
    request<{ before: string | null; after: string }>("/api/v1/ai/products/improve-description", {
      method: "POST", body: JSON.stringify({ product_id: productId }),
    }),
  aiSuggestCategory: (productId: string) =>
    request<{ suggested_category: string; confidence: number }>("/api/v1/ai/products/suggest-category", {
      method: "POST", body: JSON.stringify({ product_id: productId }),
    }),
  aiSuggestPrice: (productId: string) =>
    request<{ cost_price: number; recommended_price: number; markup_percent: number; margin_percent: number; explanation: string }>(
      "/api/v1/ai/products/suggest-price", { method: "POST", body: JSON.stringify({ product_id: productId }) }
    ),
  aiFullOptimize: (productId: string) =>
    request<any>("/api/v1/ai/products/full-optimize", {
      method: "POST", body: JSON.stringify({ product_id: productId }),
    }),

  // Orders
  listOrders: (status?: string) =>
    request<Order[]>(`/api/v1/orders${status ? `?status=${status}` : ""}`),
  ordersSummary: () => request<OrdersSummary>("/api/v1/orders/summary"),
  createOrder: (data: ManualOrderCreate) =>
    request<Order>("/api/v1/orders", { method: "POST", body: JSON.stringify(data) }),
  patchOrderStatus: (id: string, status: string) =>
    request<Order>(`/api/v1/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateOrder: (id: string, data: Partial<{ status: string }>) =>
    request<Order>(`/api/v1/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Analytics
  analyticsSummary: () => request<AnalyticsSummary>("/api/v1/analytics/summary"),
  supplierAnalytics: () => request<SupplierAnalyticsItem[]>("/api/v1/analytics/suppliers"),
  profitAnalytics: () => request<ProfitAnalytics>("/api/v1/analytics/profit"),
  recommendations: () => request<{ recommendations: string[] }>("/api/v1/analytics/recommendations"),

  // Channels
  listChannels: () => request<Channel[]>("/api/v1/channels"),
  updateChannel: (id: string, data: Partial<Channel>) =>
    request<Channel>(`/api/v1/channels/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Settings
  getSettings: () => request<PlatformSettings>("/api/v1/settings"),
  updateSettings: (data: Partial<PlatformSettings>) =>
    request<PlatformSettings>("/api/v1/settings", { method: "PUT", body: JSON.stringify(data) }),

  // Supplier Discovery
  listSupplierLeads: (filter?: SupplierLeadFilter) =>
    request<SupplierLead[]>(`/api/v1/supplier-discovery/leads${filter && filter !== "all" ? `?filter=${filter}` : ""}`),
  supplierDiscoverySummary: () =>
    request<SupplierDiscoverySummary>("/api/v1/supplier-discovery/summary"),
  createSupplierLead: (data: Partial<SupplierLead>) =>
    request<SupplierLead>("/api/v1/supplier-discovery/leads", { method: "POST", body: JSON.stringify(data) }),
  updateSupplierLead: (id: string, data: Partial<SupplierLead>) =>
    request<SupplierLead>(`/api/v1/supplier-discovery/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  convertLeadToSupplier: (id: string) =>
    request<{ lead: SupplierLead; supplier: Supplier }>(`/api/v1/supplier-discovery/leads/${id}/convert-to-supplier`, { method: "POST" }),

  // Supplier Search
  listSupplierSearchRequests: () =>
    request<SupplierSearchRequest[]>("/api/v1/supplier-search/requests"),
  supplierSearchSummary: () =>
    request<SupplierSearchSummary>("/api/v1/supplier-search/summary"),
  createSupplierSearchRequest: (data: Partial<SupplierSearchRequest>) =>
    request<SupplierSearchRequest>("/api/v1/supplier-search/requests", { method: "POST", body: JSON.stringify(data) }),
  getSupplierSearchRequest: (id: string) =>
    request<SupplierSearchRequest>(`/api/v1/supplier-search/requests/${id}`),
  generateSupplierSearchQueries: (id: string) =>
    request<SupplierSearchRequest>(`/api/v1/supplier-search/requests/${id}/generate-queries`, { method: "POST" }),
  addSupplierSearchResult: (id: string, data: SupplierSearchResultCreate) =>
    request<{ lead: SupplierLead; request: SupplierSearchRequest }>(
      `/api/v1/supplier-search/requests/${id}/add-result-as-lead`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  // Trend Products
  listTrendProductLeads: () => request<TrendProductLead[]>("/api/v1/trend-products/leads"),
  createTrendProductLead: (data: Partial<TrendProductLead>) =>
    request<TrendProductLead>("/api/v1/trend-products/leads", { method: "POST", body: JSON.stringify(data) }),
};
