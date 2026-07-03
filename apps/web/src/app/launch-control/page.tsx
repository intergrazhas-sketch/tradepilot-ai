"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, StatCard, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { LaunchControlSummary, LaunchControlIssue } from "@/types";

const QUICK_LINKS = [
  { href: "/import", labelKey: "launchControl.action.import" },
  { href: "/best-products", labelKey: "launchControl.action.bestProducts" },
  { href: "/listing-ready", labelKey: "launchControl.action.listingReady" },
  { href: "/test-launch", labelKey: "launchControl.action.testLaunch" },
  { href: "/orders", labelKey: "launchControl.action.orders" },
  { href: "/supplier-search", labelKey: "launchControl.action.supplierSearch" },
];

function checklistStatusClass(status: string) {
  switch (status) {
    case "done":
      return "bg-profit-50 text-profit-700 border-profit-200";
    case "warning":
      return "bg-warn-50 text-warn-700 border-warn-200";
    default:
      return "bg-canvas text-ink-600 border-line";
  }
}

function checklistStatusLabel(t: (k: string) => string, status: string) {
  if (status === "done") return t("launchControl.statusDone");
  if (status === "warning") return t("launchControl.statusWarning");
  return t("launchControl.statusMissing");
}

export default function LaunchControlPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<LaunchControlSummary | null>(null);
  const [issues, setIssues] = useState<LaunchControlIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    Promise.all([api.launchControlSummary(), api.launchControlIssues()])
      .then(([s, i]) => {
        setSummary(s);
        setIssues(i);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  return (
    <PageShell title={t("launchControl.title")} subtitle={t("launchControl.subtitle")}>
      {error && <ErrorBanner message={error} />}

      {!summary && !error && <Spinner />}

      {summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label={t("launchControl.kpiSuppliers")} value={String(summary.suppliers_count)} />
            <StatCard label={t("launchControl.kpiProducts")} value={String(summary.products_count)} />
            <StatCard label={t("launchControl.kpiGoodProducts")} value={String(summary.good_products_count)} accent="profit" />
            <StatCard label={t("launchControl.kpiReadyListings")} value={String(summary.ready_listings_count)} accent="profit" />
            <StatCard label={t("launchControl.kpiTestCandidates")} value={String(summary.test_candidates_count)} />
            <StatCard label={t("launchControl.kpiExpectedProfit")} value={formatMoney(summary.total_expected_profit)} accent="profit" />
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-ink-900">{t("launchControl.checklistTitle")}</h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-profit-50 text-profit-700">
                  {t("launchControl.statusDone")}: {summary.checklist_done}
                </span>
                <span className="px-2 py-1 rounded bg-warn-50 text-warn-700">
                  {t("launchControl.statusWarning")}: {summary.checklist_warning}
                </span>
                <span className="px-2 py-1 rounded bg-canvas text-ink-600 border border-line">
                  {t("launchControl.statusMissing")}: {summary.checklist_missing}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {summary.checklist.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-line hover:bg-canvas/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${checklistStatusClass(item.status)}`}>
                      {checklistStatusLabel(t, item.status)}
                    </span>
                    <div>
                      <div className="font-medium text-ink-900 text-sm">{t(item.title)}</div>
                      <div className="text-xs text-ink-500">{t("launchControl.count")}: {item.count}</div>
                    </div>
                  </div>
                  <Link href={item.action_href}>
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                      {t(item.action_label)}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-4">{t("launchControl.issuesTitle")}</h3>
            {!issues && <Spinner />}
            {issues && issues.length === 0 && (
              <EmptyState title={t("launchControl.noIssues")} hint={t("launchControl.noIssuesHint")} />
            )}
            {issues && issues.length > 0 && (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.key}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-warn-200 bg-warn-50/30"
                  >
                    <div>
                      <div className="font-medium text-ink-900 text-sm">{t(issue.title)}</div>
                      <div className="text-xs text-warn-700">{issue.count}</div>
                    </div>
                    <Link href={issue.action_href}>
                      <Button variant="ghost" className="text-xs px-3 py-1 h-auto border border-line">
                        {t(issue.action_label)}
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-4">{t("launchControl.quickLinks")}</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button variant="secondary" className="text-sm">{t(link.labelKey)}</Button>
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <StatCard label={t("launchControl.kpiSelectedForTest")} value={String(summary.selected_for_test_count)} />
            <StatCard label={t("launchControl.kpiActiveOrders")} value={String(summary.active_orders_count)} accent="warn" />
            <StatCard label={t("dashboard.avgMargin")} value={formatPercent(summary.average_margin_percent)} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
