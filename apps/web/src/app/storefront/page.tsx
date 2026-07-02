"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Input, Modal, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Product } from "@/types";

export default function StorefrontPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.listProducts().then((ps) => setProducts(ps.filter((p) => p.status === "active"))).catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => (p.name_ai || p.name_raw).toLowerCase().includes(q));
  }, [products, search]);

  const openOrder = (p: Product) => {
    setOrderProduct(p);
    setCustomerName("");
    setQuantity(1);
    setSuccess(false);
  };

  const submitOrder = async () => {
    if (!orderProduct || !customerName.trim()) return;
    setSubmitting(true);
    try {
      await api.createOrder({
        customer_name: customerName,
        items: [{ product_id: orderProduct.id, quantity }],
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title={t("storefront.title")} subtitle={t("storefront.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <Input
        placeholder={t("common.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs mb-5"
      />

      {!products && !error && <Spinner />}
      {products && filtered.length === 0 && <Card><EmptyState title={t("common.empty")} hint="Активируйте товары через AI Studio, чтобы они появились здесь" /></Card>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="p-4 flex flex-col">
            <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden border border-line bg-gradient-to-br from-canvas via-surface to-brand-50/40 flex flex-col items-center justify-center text-center px-3">
              <div className="w-12 h-12 rounded-full bg-surface/80 border border-line flex items-center justify-center text-ink-300 mb-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                  <path d="M4 16l4-4 3 3 5-6 4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-ink-500">{t("storefront.photoPlaceholder")}</span>
              <span className="text-[10px] text-ink-400 mt-1 leading-snug">{t("storefront.photoHint")}</span>
            </div>
            <div className="text-xs text-ink-500 mb-1">{p.category || "Товар"}</div>
            <div className="text-sm font-medium text-ink-900 mb-2 line-clamp-2 flex-1">{p.name_ai || p.name_raw}</div>
            <div className="text-lg font-semibold text-ink-900 mb-3">{formatMoney(p.selling_price, p.currency)}</div>
            <Button onClick={() => openOrder(p)} className="w-full">{t("storefront.createOrder")}</Button>
          </Card>
        ))}
      </div>

      <Modal open={!!orderProduct} onClose={() => setOrderProduct(null)} title={t("storefront.createOrder")}>
        {orderProduct && !success && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-ink-900">{orderProduct.name_ai || orderProduct.name_raw}</div>
            <div className="text-sm text-ink-500">{formatMoney(orderProduct.selling_price, orderProduct.currency)}</div>
            <Input label="Имя клиента" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input
              label={t("products.stock")}
              type="number"
              min={1}
              max={orderProduct.stock_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOrderProduct(null)}>{t("common.cancel")}</Button>
              <Button onClick={submitOrder} disabled={submitting || !customerName.trim()}>
                {submitting ? t("common.loading") : t("common.create")}
              </Button>
            </div>
          </div>
        )}
        {success && (
          <div className="text-center py-4">
            <div className="text-profit-500 font-medium mb-2">Заказ создан ✓</div>
            <p className="text-sm text-ink-500 mb-4">Посмотрите его в разделе "Заказы"</p>
            <Button onClick={() => setOrderProduct(null)}>{t("common.close")}</Button>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
