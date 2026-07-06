"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Select, DecisionBadge, TestStatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { ProductListingModal } from "@/components/ProductListingModal";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import { translateDecisionReason } from "@/lib/app-text";
import type { Product, Supplier } from "@/types";

type SortBy = "score" | "profit" | "margin";

export default function BestProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("score");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listingProduct, setListingProduct] = useState<Product | null>(null);

  const load = () => {
    api.listBestProducts(sortBy).then(setProducts).catch((e) => setError(e.message));
    api.listSuppliers().then(setSuppliers).catch(() => {});
  };

  useEffect(() => { load(); }, [sortBy]);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name || "—";

  const setTestStatus = async (id: string, test_status: Product["test_status"]) => {
    setBusyId(id);
    try {
      await api.updateTestStatus(id, test_status);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const setTestLaunch = async (id: string) => {
    setBusyId(id);
    try {
      await api.testLaunchSelect(id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const testLabel = (s: string) => {
    if (s === "candidate") return t("testStatus.candidate");
    if (s === "testing") return t("testStatus.testing");
    if (s === "rejected") return t("testStatus.rejected");
    return t("testStatus.none");
  };

  return (
    <PageShell title={t("bestProducts.title")} subtitle={t("bestProducts.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="max-w-[200px]">
          <option value="score">{t("bestProducts.sortScore")}</option>
          <option value="profit">{t("bestProducts.sortProfit")}</option>
          <option value="margin">{t("bestProducts.sortMargin")}</option>
        </Select>
        <Link href="/import"><Button variant="secondary">{t("dashboard.btnUploadPrice")}</Button></Link>
      </div>

      {!products && !error && <Spinner />}
      {products && products.length === 0 && (
        <Card><EmptyState title={t("bestProducts.empty")} hint={t("dashboard.btnUploadPrice")} /></Card>
      )}

      {products && products.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("products.name")}</th>
                <th className="px-4 py-3 font-medium">{t("products.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("orders.sku")}</th>
                <th className="px-4 py-3 font-medium">{t("products.cost")}</th>
                <th className="px-4 py-3 font-medium">{t("products.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("products.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("products.stock")}</th>
                <th className="px-4 py-3 font-medium">{t("decision.reason")}</th>
                <th className="px-4 py-3 font-medium w-[200px]">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{p.name_ai || p.name_raw}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <DecisionBadge status="good" label={t("decision.good")} />
                      <TestStatusBadge status={p.test_status} label={testLabel(p.test_status)} />
                      <span className="text-xs text-ink-500">{Math.round(p.decision_score)} {t("decision.pointsUnit")}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{supplierName(p.supplier_id)}</td>
                  <td className="px-4 py-3 text-ink-700">{p.sku || "—"}</td>
                  <td className="px-4 py-3">{formatMoney(p.cost_price, p.currency)}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(p.selling_price, p.currency)}</td>
                  <td className="px-4 py-3 text-profit-500 font-medium">{formatMoney(p.gross_profit, p.currency)}</td>
                  <td className="px-4 py-3">{formatPercent(p.margin_percent)}</td>
                  <td className="px-4 py-3">{p.stock_quantity}</td>
                  <td className="px-4 py-3 text-xs text-ink-600 max-w-[160px]">{translateDecisionReason(t, p.decision_reason)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" disabled={busyId === p.id} onClick={() => setListingProduct(p)}>
                        {t("listing.prepareCard")}
                      </Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" disabled={busyId === p.id} onClick={() => setTestLaunch(p.id)}>
                        {t("testLaunch.addToLaunch")}
                      </Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" disabled={busyId === p.id} onClick={() => setTestStatus(p.id, "candidate")}>
                        {t("testStatus.markCandidate")}
                      </Button>
                      <Button variant="ghost" className="!px-2 !py-1 text-xs border border-line/60" disabled={busyId === p.id} onClick={() => setTestStatus(p.id, "testing")}>
                        {t("testStatus.markTesting")}
                      </Button>
                      <Button variant="ghost" className="!px-2 !py-1 text-xs text-danger-500 border border-danger-500/20" disabled={busyId === p.id} onClick={() => setTestStatus(p.id, "rejected")}>
                        {t("testStatus.markRejected")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ProductListingModal
        product={listingProduct}
        open={!!listingProduct}
        onClose={() => setListingProduct(null)}
        onSaved={load}
      />
    </PageShell>
  );
}
