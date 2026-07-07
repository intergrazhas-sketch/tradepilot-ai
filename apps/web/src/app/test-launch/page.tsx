"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Select, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { productDisplayTitle } from "@/components/ProductListingModal";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { TestLaunchProduct, TestLaunchSummary } from "@/types";

const STATUS_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "common.all" },
  { value: "not_selected", labelKey: "testLaunch.statusNotSelected" },
  { value: "selected", labelKey: "testLaunch.statusSelected" },
  { value: "in_progress", labelKey: "testLaunch.statusInProgress" },
  { value: "paused", labelKey: "testLaunch.statusPaused" },
  { value: "completed", labelKey: "testLaunch.statusCompleted" },
];

function launchStatusLabel(t: (k: string) => string, status?: string) {
  const map: Record<string, string> = {
    not_selected: "testLaunch.statusNotSelected",
    selected: "testLaunch.statusSelected",
    in_progress: "testLaunch.statusInProgress",
    paused: "testLaunch.statusPaused",
    completed: "testLaunch.statusCompleted",
  };
  return t(map[status || "not_selected"] || status || "—");
}

function statusBadgeClass(status?: string) {
  switch (status) {
    case "selected":
      return "bg-brand-50 text-brand-700";
    case "in_progress":
      return "bg-profit-50 text-profit-700";
    case "paused":
      return "bg-warn-50 text-warn-700";
    case "completed":
      return "bg-ink-100 text-ink-700";
    default:
      return "bg-canvas text-ink-600";
  }
}

export default function TestLaunchPage() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<TestLaunchProduct[] | null>(null);
  const [summary, setSummary] = useState<TestLaunchSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    Promise.all([
      api.testLaunchCandidates(statusFilter || undefined),
      api.testLaunchSummary(),
    ])
      .then(([items, sum]) => {
        setProducts(items);
        setSummary(sum);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      await api.testLaunchExportCsv();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell title={t("testLaunch.title")} subtitle={t("testLaunch.subtitle")}>
      {error && <ErrorBanner message={error} />}

      {summary && (
        <Card className="p-5 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-xs text-ink-500">{t("testLaunch.totalCandidates")}</div>
              <div className="text-xl font-semibold text-ink-900">{summary.total_candidates}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">{t("testLaunch.selectedCount")}</div>
              <div className="text-xl font-semibold text-brand-600">{summary.selected_count}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">{t("testLaunch.inProgressCount")}</div>
              <div className="text-xl font-semibold text-profit-600">{summary.in_progress_count}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">{t("testLaunch.expectedProfit")}</div>
              <div className="text-xl font-semibold text-profit-600">{formatMoney(summary.total_expected_profit)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-500">{t("dashboard.avgMargin")}</div>
              <div className="text-xl font-semibold">{formatPercent(summary.average_margin_percent)}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-[220px]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>{t(opt.labelKey)}</option>
          ))}
        </Select>
        <Button variant="secondary" disabled={exporting} onClick={handleExport}>
          {exporting ? t("common.loading") : t("testLaunch.exportCsv")}
        </Button>
        <Link href="/listing-ready"><Button variant="ghost" className="border border-line">{t("nav.listingReady")}</Button></Link>
      </div>

      {!products && !error && <Spinner />}
      {products && products.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("testLaunch.emptyHint")} /></Card>
      )}

      {products && products.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("products.name")}</th>
                <th className="px-4 py-3 font-medium">{t("products.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("products.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("products.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("products.stock")}</th>
                <th className="px-4 py-3 font-medium">{t("listing.score")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 font-medium w-[220px]">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const st = p.test_launch_status || "not_selected";
                const disabled = busyId === p.id;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/50 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">{productDisplayTitle(p, locale)}</div>
                      <div className="text-xs text-ink-500">{p.sku || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{p.supplier_name || "—"}</td>
                    <td className="px-4 py-3 font-medium">{formatMoney(p.selling_price, p.currency)}</td>
                    <td className="px-4 py-3 text-profit-500 font-medium">{formatMoney(p.gross_profit, p.currency)}</td>
                    <td className="px-4 py-3">{formatPercent(p.margin_percent)}</td>
                    <td className="px-4 py-3">{p.stock_quantity}</td>
                    <td className="px-4 py-3 font-semibold text-brand-600">{p.listing_score ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(st)}`}>
                        {launchStatusLabel(t, st)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {st === "not_selected" && (
                          <Button
                            className="!px-2 !py-1 text-xs"
                            disabled={disabled}
                            onClick={() => runAction(p.id, () => api.testLaunchSelect(p.id))}
                          >
                            {t("testLaunch.actionSelect")}
                          </Button>
                        )}
                        {(st === "selected" || st === "paused") && (
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            disabled={disabled}
                            onClick={() => runAction(p.id, () => api.testLaunchUpdateStatus(p.id, "in_progress"))}
                          >
                            {t("testLaunch.actionInProgress")}
                          </Button>
                        )}
                        {st === "in_progress" && (
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs border border-line/60"
                            disabled={disabled}
                            onClick={() => runAction(p.id, () => api.testLaunchUpdateStatus(p.id, "paused"))}
                          >
                            {t("testLaunch.actionPause")}
                          </Button>
                        )}
                        {st !== "not_selected" && st !== "completed" && (
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs text-profit-600 border border-profit-500/20"
                            disabled={disabled}
                            onClick={() => runAction(p.id, () => api.testLaunchUpdateStatus(p.id, "completed"))}
                          >
                            {t("testLaunch.actionCompleted")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
