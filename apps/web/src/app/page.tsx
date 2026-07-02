"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, StatCard, StatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import type { DashboardSummary } from "@/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboardSummary().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
      {error && <ErrorBanner message={error} />}
      {!data && !error && <Spinner />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t("dashboard.totalProducts")} value={String(data.total_products)} />
            <StatCard label={t("dashboard.activeProducts")} value={String(data.active_products)} />
            <StatCard label={t("dashboard.suppliers")} value={String(data.total_suppliers)} />
            <StatCard label={t("dashboard.orders")} value={String(data.total_orders)} />
            <StatCard label={t("dashboard.revenue")} value={formatMoney(data.revenue)} accent="default" />
            <StatCard label={t("dashboard.profit")} value={formatMoney(data.profit)} accent="profit" />
            <StatCard label={t("dashboard.avgMargin")} value={`${data.average_margin_percent}%`} />
            <StatCard label={t("dashboard.lowStock")} value={String(data.low_stock_products)} accent={data.low_stock_products > 0 ? "warn" : "default"} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-5">
              <h3 className="font-semibold text-ink-900 mb-4">{t("dashboard.recentOrders")}</h3>
              {data.recent_orders.length === 0 ? (
                <EmptyState title={t("common.empty")} />
              ) : (
                <div className="divide-y divide-line">
                  {data.recent_orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-ink-900">{order.customer_name}</div>
                        <div className="text-xs text-ink-500">{formatDate(order.created_at)}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-ink-900">{formatMoney(order.total_amount)}</div>
                          <div className="text-xs text-profit-500">+{formatMoney(order.profit_amount)}</div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                {t("dashboard.aiRecommendations")}
              </h3>
              <ul className="space-y-3">
                {data.ai_recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-ink-700 bg-brand-50/60 border border-brand-100 rounded-lg px-3 py-2.5">
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
