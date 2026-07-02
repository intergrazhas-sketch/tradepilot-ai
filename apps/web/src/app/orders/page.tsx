"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Select, StatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { ORDER_STATUSES, type Order } from "@/types";

export default function OrdersPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = () => api.listOrders(statusFilter || undefined).then(setOrders).catch((e) => setError(e.message));

  useEffect(() => { load(); }, [statusFilter]);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.updateOrder(id, { status });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const statusLabel = (status: string) => {
    const key = `orderStatus.${status}`;
    const label = t(key);
    return label === key ? status : label;
  };

  return (
    <PageShell title={t("orders.title")} subtitle={t("orders.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <div className="mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[220px]">
          <option value="">{t("common.status")}: {t("common.all")}</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </Select>
      </div>

      {!orders && !error && <Spinner />}
      {orders && orders.length === 0 && <Card><EmptyState title={t("common.empty")} hint="Создайте заказ из раздела Витрина" /></Card>}

      {orders && orders.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("orders.customer")}</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">{t("orders.total")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{o.customer_name}</div>
                    <div className="text-xs text-ink-500">{o.items.length} товар(ов)</div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(o.total_amount)}</td>
                  <td className="px-4 py-3 text-profit-500 font-medium">{formatMoney(o.profit_amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        value={o.status}
                        onChange={(e) => changeStatus(o.id, e.target.value)}
                        className="text-xs border border-line rounded-md px-2 py-1.5 bg-surface text-ink-700 min-w-[132px]"
                      >
                        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
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
