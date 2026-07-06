"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Input, Modal, Spinner, EmptyState, ErrorBanner, DecisionBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import { productDisplayTitle, productDisplayDescription } from "@/components/ProductListingModal";
import type { Product, Supplier } from "@/types";

function isStorefrontProduct(p: Product) {
  return p.listing_status === "ready";
}

export default function StorefrontPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [orderProduct, setOrderProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    Promise.all([api.listListingReady(), api.listSuppliers()])
      .then(([ps, ss]) => {
        setProducts(ps.filter(isStorefrontProduct));
        setSuppliers(ss);
      })
      .catch((e) => setError(e.message));
  }, []);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name || "—";

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter((p) => productDisplayTitle(p).toLowerCase().includes(q));
  }, [products, search]);

  const openOrder = (p: Product) => {
    setOrderProduct(p);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNote("");
    setQuantity(1);
    setSellingPrice(p.selling_price);
    setSuccess(false);
    setError(null);
  };

  const unitCost = orderProduct?.cost_price ?? 0;
  const expectedProfit = useMemo(() => {
    const qty = Math.max(1, quantity || 1);
    return Math.round((sellingPrice - unitCost) * qty * 100) / 100;
  }, [sellingPrice, unitCost, quantity]);

  const expectedMargin = useMemo(() => {
    if (!sellingPrice) return 0;
    return Math.round(((sellingPrice - unitCost) / sellingPrice) * 1000) / 10;
  }, [sellingPrice, unitCost]);

  const submitOrder = async () => {
    if (!orderProduct) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createOrder({
        product_id: orderProduct.id,
        quantity: Math.max(1, quantity || 1),
        customer_name: customerName,
        customer_phone: customerPhone || undefined,
        customer_note: customerNote || undefined,
        selling_price: sellingPrice,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const decisionLabel = (status: string) => {
    if (status === "good") return t("decision.good");
    if (status === "risk") return t("decision.risk");
    if (status === "bad") return t("decision.bad");
    return status;
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
      {products && filtered.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("storefront.empty")} /></Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <Card key={p.id} className="p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <DecisionBadge status={p.decision_status} label={decisionLabel(p.decision_status)} />
              <span className="text-xs text-ink-500">{t("decision.score")}: {p.decision_score}</span>
            </div>
            <div className="text-sm font-medium text-ink-900 mb-1 line-clamp-2 flex-1">{productDisplayTitle(p)}</div>
            {productDisplayDescription(p) && (
              <p className="text-xs text-ink-500 mb-2 line-clamp-2">{productDisplayDescription(p)}</p>
            )}
            <div className="text-xs text-ink-500 mb-3">{t("products.supplier")}: {supplierName(p.supplier_id)}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-4">
              <div className="text-ink-500">{t("products.price")}</div>
              <div className="font-medium text-ink-900">{formatMoney(p.selling_price, p.currency)}</div>
              <div className="text-ink-500">{t("products.profit")}</div>
              <div className="font-medium text-profit-500">{formatMoney(p.gross_profit, p.currency)}</div>
              <div className="text-ink-500">{t("products.margin")}</div>
              <div className="font-medium text-ink-900">{formatPercent(p.margin_percent)}</div>
              <div className="text-ink-500">{t("products.stock")}</div>
              <div className="font-medium text-ink-900">{p.stock_quantity}</div>
            </div>
            <Button onClick={() => openOrder(p)} className="w-full mt-auto">{t("storefront.createOrder")}</Button>
          </Card>
        ))}
      </div>

      <Modal open={!!orderProduct} onClose={() => setOrderProduct(null)} title={t("storefront.createOrder")}>
        {orderProduct && !success && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-ink-900">{productDisplayTitle(orderProduct)}</div>
            <div className="text-xs text-ink-500">{t("products.supplier")}: {supplierName(orderProduct.supplier_id)}</div>
            <Input
              label={t("storefront.quantity")}
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
            <Input
              label={t("storefront.sellingPrice")}
              type="number"
              min={0}
              step={0.01}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
            />
            <Input label={t("storefront.customerName")} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input label={t("storefront.customerPhone")} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <Input label={t("storefront.customerNote")} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
            <div className="rounded-lg bg-profit-50 border border-profit-100 px-3 py-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-600">{t("storefront.expectedProfit")}</span>
                <span className="font-semibold text-profit-600">{formatMoney(expectedProfit, orderProduct.currency)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-ink-600">{t("storefront.expectedMargin")}</span>
                <span className="font-medium text-ink-900">{formatPercent(expectedMargin)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setOrderProduct(null)}>{t("common.cancel")}</Button>
              <Button onClick={submitOrder} disabled={submitting}>
                {submitting ? t("common.loading") : t("common.create")}
              </Button>
            </div>
          </div>
        )}
        {success && (
          <div className="text-center py-4">
            <div className="text-profit-500 font-medium mb-2">{t("storefront.orderCreated")}</div>
            <p className="text-sm text-ink-500 mb-4">{t("storefront.orderCreatedHint")}</p>
            <div className="flex justify-center gap-2">
              <Link href="/orders"><Button>{t("storefront.goToOrders")}</Button></Link>
              <Button variant="secondary" onClick={() => setOrderProduct(null)}>{t("common.close")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
