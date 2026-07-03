"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, StatCard, StatusBadge, DecisionBadge, Button, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatDate, formatPercent } from "@/lib/format";
import type { DashboardSummary, AnalyticsSummary, WorkflowHints, OrdersSummary, SupplierDiscoverySummary, SupplierSearchSummary } from "@/types";

export default function DashboardPage() {
  const { t } = useI18n();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowHints | null>(null);
  const [ordersSummary, setOrdersSummary] = useState<OrdersSummary | null>(null);
  const [discoverySummary, setDiscoverySummary] = useState<SupplierDiscoverySummary | null>(null);
  const [searchSummary, setSearchSummary] = useState<SupplierSearchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = () => {
    Promise.all([
      api.dashboardSummary(),
      api.analyticsSummary(),
      api.workflowHints(),
      api.ordersSummary(),
      api.supplierDiscoverySummary(),
      api.supplierSearchSummary(),
    ])
      .then(([summary, stats, wf, os, ds, ss]) => {
        setData(summary);
        setAnalytics(stats);
        setWorkflow(wf);
        setOrdersSummary(os);
        setDiscoverySummary(ds);
        setSearchSummary(ss);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { reload(); }, []);

  const decisionLabel = (status: string) => {
    if (status === "good") return t("decision.good");
    if (status === "risk") return t("decision.risk");
    if (status === "bad") return t("decision.bad");
    return status;
  };

  return (
    <PageShell title={t("dashboard.title")} subtitle={t("dashboard.subtitle")}>
      {error && <ErrorBanner message={error} />}
      {!data && !error && <Spinner />}

      {data && workflow && (
        <div className="space-y-6">
          <Card className="p-5 border-brand-200 bg-brand-50/30">
            <h3 className="font-semibold text-ink-900 mb-2">{t("dashboard.whatToDoNow")}</h3>
            <p className="text-sm text-ink-700 mb-4">{t(workflow.primary_message)}</p>
            {workflow.secondary_messages.map((key) => (
              <p key={key} className="text-xs text-warn-600 mb-1">• {t(key)}</p>
            ))}
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/import"><Button>{t("dashboard.btnUploadPrice")}</Button></Link>
              <Link href="/best-products"><Button variant="secondary">{t("dashboard.btnBestProducts")}</Button></Link>
              <Link href="/storefront"><Button variant="secondary">{t("nav.storefront")}</Button></Link>
              <Link href="/orders"><Button variant="secondary">{t("nav.orders")}</Button></Link>
              <Link href="/suppliers"><Button variant="secondary">{t("dashboard.btnSuppliers")}</Button></Link>
              <Link href="/supplier-discovery"><Button variant="secondary">{t("nav.supplierDiscovery")}</Button></Link>
              <Link href="/supplier-search"><Button variant="secondary">{t("nav.supplierSearch")}</Button></Link>
              <Link href="/products?filter=risk"><Button variant="ghost" className="border border-line">{t("dashboard.btnRiskBad")}</Button></Link>
            </div>
          </Card>

          {ordersSummary && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink-900">{t("dashboard.ordersBlock")}</h3>
                <Link href="/orders" className="text-sm text-brand-600 hover:underline">{t("nav.orders")}</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label={t("dashboard.orders")} value={String(ordersSummary.total_orders)} />
                <StatCard label={t("dashboard.ordersNew")} value={String(ordersSummary.new_orders)} />
                <StatCard label={t("dashboard.ordersDelivered")} value={String(ordersSummary.delivered_orders)} accent="profit" />
                <StatCard label={t("dashboard.profit")} value={formatMoney(ordersSummary.total_profit)} accent="profit" />
                <StatCard label={t("dashboard.avgMargin")} value={formatPercent(ordersSummary.average_margin_percent)} />
              </div>
            </Card>
          )}

          {searchSummary && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink-900">{t("dashboard.searchBlock")}</h3>
                <Link href="/supplier-search" className="text-sm text-brand-600 hover:underline">{t("nav.supplierSearch")}</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label={t("dashboard.searchRequests")} value={String(searchSummary.total_requests)} />
                <StatCard label={t("dashboard.searchLeads")} value={String(searchSummary.leads_created_from_search)} accent="profit" />
                <StatCard label={t("dashboard.searchHighFit")} value={String(searchSummary.high_fit_leads)} accent="profit" />
              </div>
            </Card>
          )}

          {discoverySummary && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink-900">{t("dashboard.discoveryBlock")}</h3>
                <Link href="/supplier-discovery" className="text-sm text-brand-600 hover:underline">{t("nav.supplierDiscovery")}</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label={t("dashboard.discoveryTotalLeads")} value={String(discoverySummary.total_leads)} />
                <StatCard label={t("dashboard.discoveryOpenPrice")} value={String(discoverySummary.open_price_leads)} accent="profit" />
                <StatCard label={t("dashboard.discoveryHighFit")} value={String(discoverySummary.high_fit_leads)} accent="profit" />
                <StatCard label={t("dashboard.discoveryTrendIdeas")} value={String(discoverySummary.trend_product_ideas)} />
              </div>
            </Card>
          )}

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

          {analytics && (
            <Card className="p-5">
              <h3 className="font-semibold text-ink-900 mb-4">{t("dashboard.decisionBlock")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
                <StatCard label={t("dashboard.goodProducts")} value={String(analytics.good_products)} accent="profit" />
                <StatCard label={t("dashboard.riskProducts")} value={String(analytics.risk_products)} accent="warn" />
                <StatCard label={t("dashboard.badProducts")} value={String(analytics.bad_products)} />
                <StatCard label={t("dashboard.avgMargin")} value={formatPercent(analytics.average_margin_percent)} />
                <StatCard label={t("dashboard.potentialProfit")} value={formatMoney(analytics.total_potential_profit)} accent="profit" />
                <StatCard label={t("products.markup")} value={formatPercent(analytics.average_markup_percent)} />
              </div>
              <h4 className="text-sm font-medium text-ink-700 mb-3">{t("dashboard.topProducts")}</h4>
              {analytics.top_products_by_profit.length === 0 ? (
                <EmptyState title={t("common.empty")} />
              ) : (
                <div className="divide-y divide-line">
                  {analytics.top_products_by_profit.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">{p.name}</div>
                        <div className="text-xs text-ink-500">{formatMoney(p.gross_profit)} · {formatPercent(p.margin_percent)}</div>
                      </div>
                      <DecisionBadge status={p.decision_status} label={decisionLabel(p.decision_status)} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

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
