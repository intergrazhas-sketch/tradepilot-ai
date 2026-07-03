"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Select, StatusBadge, Button, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
import { ORDER_STATUSES, type Order } from "@/types";

const STATUS_ACTIONS: { status: string; key: string; variant?: "secondary" | "ghost" }[] = [
  { status: "confirmed", key: "orders.actionConfirm" },
  { status: "supplier_ordered", key: "orders.actionSupplierOrdered", variant: "secondary" },
  { status: "delivered", key: "orders.actionDelivered" },
  { status: "cancelled", key: "orders.actionCancel", variant: "ghost" },
];

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => api.listOrders(statusFilter || undefined).then(setOrders).catch((e) => setError(e.message));

  useEffect(() => { load(); }, [statusFilter]);

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

  const productLabel = (o: Order) => {
    if (o.product_name) return o.product_name;
    if (o.items.length === 1) return `${o.items.length} ${t("orders.product").toLowerCase()}`;
    return `${o.items.length} ${t("orders.product").toLowerCase()}`;
  };

  return (
    <PageShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[220px]">
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </Select>
        <Link href="/storefront"><Button variant="secondary">{t("storefront.createOrder")}</Button></Link>
      </div>

      {!orders && !error && <Spinner />}
      {orders && orders.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("orders.emptyHint")} /></Card>
      )}

      {orders && orders.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("orders.product")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.customer")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.quantity")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.total")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{productLabel(o)}</div>
                    <div className="text-xs text-ink-500">{o.supplier_name || "—"}</div>
                    <div className="text-xs text-ink-400">{formatDate(o.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{o.customer_name || "—"}</div>
                    {o.customer_phone && <div className="text-xs text-ink-500">{o.customer_phone}</div>}
                    {o.customer_note && <div className="text-xs text-ink-400 mt-0.5">{o.customer_note}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{o.quantity || o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(o.total_amount)}</td>
                  <td className="px-4 py-3 text-profit-500 font-medium">{formatMoney(o.gross_profit ?? o.profit_amount)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(o.margin_percent)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_ACTIONS.filter((a) => a.status !== o.status).map((a) => (
                        <Button
                          key={a.status}
                          variant={a.variant || "secondary"}
                          className="text-xs px-2 py-1 h-auto"
                          disabled={busyId === o.id || o.status === "cancelled" || o.status === "delivered"}
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
