"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Select, StatusBadge, Button, StatCard, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
import { ORDER_STATUSES, type Order, type OrdersSummary } from "@/types";

const STATUS_ACTIONS: { status: string; key: string; variant?: "secondary" | "ghost" }[] = [
  { status: "confirmed", key: "orders.actionConfirm" },
  { status: "supplier_ordered", key: "orders.actionSupplierOrdered", variant: "secondary" },
  { status: "delivered", key: "orders.actionDelivered" },
  { status: "cancelled", key: "orders.actionCancel", variant: "ghost" },
];

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api.listOrders(statusFilter || undefined),
      api.ordersSummary(),
    ])
      .then(([list, sum]) => {
        setOrders(list);
        setSummary(sum);
      })
      .catch((e) => setError(e.message));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.patchOrderStatus(id, status);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (status: string) => {
    const key = `orderStatus.${status}`;
    const label = t(key);
    return label === key ? status : label;
  };

  const productLabel = (o: Order) => o.product_name || t("orders.unknownProduct");

  const isFinal = (status: string) => status === "cancelled" || status === "delivered";

  return (
    <PageShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      {error && <ErrorBanner message={error} />}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard label={t("orders.summaryTotal")} value={String(summary.total_orders)} />
          <StatCard label={t("orders.summaryNew")} value={String(summary.new_orders)} />
          <StatCard label={t("orders.summaryDelivered")} value={String(summary.delivered_orders)} accent="profit" />
          <StatCard label={t("orders.summaryCancelled")} value={String(summary.cancelled_orders)} accent="warn" />
          <StatCard label={t("orders.profit")} value={formatMoney(summary.total_profit)} accent="profit" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[220px]">
          <option value="">{t("orders.filterAll")}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                statusFilter === s
                  ? "bg-brand-50 border-brand-200 text-brand-700 font-medium"
                  : "border-line text-ink-600 hover:bg-canvas"
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
        <Link href="/storefront" className="ml-auto"><Button variant="secondary">{t("storefront.createOrder")}</Button></Link>
      </div>

      {!orders && !error && <Spinner />}
      {orders && orders.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("orders.emptyHint")} /></Card>
      )}

      {orders && orders.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("orders.customer")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.product")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.quantity")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.revenue")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.createdAt")}</th>
                <th className="px-4 py-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas/50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{o.customer_name || "—"}</div>
                    {o.customer_phone && <div className="text-xs text-ink-500">{o.customer_phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{productLabel(o)}</div>
                    {o.product_sku && <div className="text-xs text-ink-500">{t("orders.sku")}: {o.product_sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{o.supplier_name || "—"}</td>
                  <td className="px-4 py-3 text-ink-700">{o.quantity || o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(o.total_amount)}</td>
                  <td className="px-4 py-3 text-profit-500 font-medium">{formatMoney(o.gross_profit ?? o.profit_amount)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(o.margin_percent)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                      {STATUS_ACTIONS.filter((a) => a.status !== o.status).map((a) => (
                        <Button
                          key={a.status}
                          variant={a.variant || "secondary"}
                          className="text-xs px-2 py-1 h-auto"
                          disabled={busyId === o.id || isFinal(o.status)}
                          onClick={() => changeStatus(o.id, a.status)}
                        >
                          {t(a.key)}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
