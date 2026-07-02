// Shared constants between frontend and backend (kept in sync manually for the MVP).
// Backend mirror: apps/api/app/routers/orders.py -> VALID_STATUSES
// Frontend mirror: apps/web/src/types/index.ts -> ORDER_STATUSES

export const ORDER_STATUSES = [
  "new",
  "sent_to_supplier",
  "confirmed",
  "shipped",
  "completed",
  "cancelled",
] as const;

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;

export const PLANS = ["free", "starter", "pro", "business"] as const;

export const CHANNEL_STATUSES = ["not_connected", "planned", "connected"] as const;
