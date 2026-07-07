"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Input, Select, DecisionBadge, TestStatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { ProductListingModal, listingStatusLabel } from "@/components/ProductListingModal";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import { translateDecisionReason, emptyDisplay } from "@/lib/app-text";
import { displayProductCategory, displayProductTitle, localizeCategory } from "@/lib/product-display";
import type { Product, Supplier } from "@/types";

type DecisionFilter = "" | "good" | "risk" | "bad";

export default function ProductsPageWrapper() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductsPage />
    </Suspense>
  );
}

function ProductsPage() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listingProduct, setListingProduct] = useState<Product | null>(null);

  const load = () => {
    api.listProducts().then(setProducts).catch((e) => setError(e.message));
    api.listSuppliers().then(setSuppliers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "good" || f === "risk" || f === "bad") setDecisionFilter(f);
  }, [searchParams]);

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

  const testLabel = (s: string) => {
    if (s === "candidate") return t("testStatus.candidate");
    if (s === "testing") return t("testStatus.testing");
    if (s === "rejected") return t("testStatus.rejected");
    return "";
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products?.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      if (supplierFilter && p.supplier_id !== supplierFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (decisionFilter && p.decision_status !== decisionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.name_ai || p.name_raw} ${p.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, supplierFilter, categoryFilter, decisionFilter, search]);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name || "—";

  const profitHint = (gross: number) => {
    if (gross > 0) return { tone: "text-profit-500", label: t("products.profitPositive") };
    if (gross < 0) return { tone: "text-danger-500", label: t("products.profitNegative") };
    return { tone: "text-ink-500", label: t("products.profitZero") };
  };

  const decisionLabel = (status: string) => {
    if (status === "good") return t("decision.good");
    if (status === "risk") return t("decision.risk");
    if (status === "bad") return t("decision.bad");
    return status;
  };

  const aiImprove = async (id: string) => {
    setBusyId(id);
    try {
      await api.aiFullOptimize(id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const recalcPrice = async (id: string) => {
    setBusyId(id);
    try {
      await api.aiSuggestPrice(id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const removeProduct = async (id: string) => {
    if (!window.confirm(t("products.deleteConfirm"))) return;
    setBusyId(id);
    setError(null);
    try {
      await api.deleteProduct(id);
      if (listingProduct?.id === id) setListingProduct(null);
      load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message === "product_has_orders" ? t("products.deleteHasOrders") : message);
    } finally {
      setBusyId(null);
    }
  };

  const filterBtn = (value: DecisionFilter, label: string) => (
    <Button
      key={value || "all"}
      variant={decisionFilter === value ? "primary" : "secondary"}
      className="!px-3 !py-1.5 text-xs"
      onClick={() => setDecisionFilter(value)}
    >
      {label}
    </Button>
  );

  return (
    <PageShell title={t("products.title")} subtitle={t("products.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3 mb-3">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="max-w-[220px]">
          <option value="">{t("products.filterBySupplier")}: {t("common.all")}</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="max-w-[220px]">
          <option value="">{t("products.filterByCategory")}: {t("common.all")}</option>
          {categories.map((c) => <option key={c} value={c}>{localizeCategory(c, locale)}</option>)}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filterBtn("", t("decision.filterAll"))}
        {filterBtn("good", t("decision.filterGood"))}
        {filterBtn("risk", t("decision.filterRisk"))}
        {filterBtn("bad", t("decision.filterBad"))}
      </div>

      {!products && !error && <Spinner />}
      {products && filtered.length === 0 && <Card><EmptyState title={t("common.empty")} /></Card>}

      {products && filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1280px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("products.name")}</th>
                <th className="px-4 py-3 font-medium">{t("decision.reason")}</th>
                <th className="px-4 py-3 font-medium">{t("products.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("products.cost")}</th>
                <th className="px-4 py-3 font-medium">{t("products.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("products.markup")}</th>
                <th className="px-4 py-3 font-medium">{t("products.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("decision.score")}</th>
                <th className="px-4 py-3 font-medium">{t("products.stock")}</th>
                <th className="px-4 py-3 font-medium w-[200px]">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const gross = p.gross_profit ?? (p.selling_price - p.cost_price);
                const hint = profitHint(gross);
                return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{displayProductTitle(p, locale)}</div>
                    <div className="text-xs text-ink-500 mb-1.5">{emptyDisplay(t, p.sku)} · {displayProductCategory(p, locale) || t("products.noCategory")}</div>
                    <div className="flex flex-wrap gap-1.5">
                      <DecisionBadge status={p.decision_status} label={decisionLabel(p.decision_status)} />
                      <TestStatusBadge status={p.test_status} label={testLabel(p.test_status)} />
                      {(p.listing_status || p.listing_score) ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink-600">
                          {listingStatusLabel(t, p.listing_status)} · {p.listing_score ?? 0}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-600 max-w-[180px]">{translateDecisionReason(t, p.decision_reason)}</td>
                  <td className="px-4 py-3 text-ink-700">{supplierName(p.supplier_id)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatMoney(p.cost_price, p.currency)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(p.selling_price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${hint.tone}`}>{formatMoney(gross, p.currency)}</div>
                    <div className={`text-[11px] mt-0.5 ${hint.tone}`}>{hint.label}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(p.markup_percent ?? 0)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(p.margin_percent ?? 0)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{Math.round(p.decision_score ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock_quantity <= 0 ? "text-danger-500 font-medium" : p.stock_quantity <= 5 ? "text-warn-500 font-medium" : "text-ink-700"}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-[200px]">
                    <div className="flex flex-col gap-2 min-w-[168px]">
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs w-full justify-start whitespace-normal text-left leading-snug"
                        disabled={busyId === p.id}
                        onClick={() => setListingProduct(p)}
                      >
                        {t("listing.cardButton")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2.5 !py-1.5 text-xs w-full justify-start whitespace-normal text-left leading-snug border border-line/60"
                        disabled={busyId === p.id}
                        onClick={() => aiImprove(p.id)}
                      >
                        ✨ {t("products.aiImprove")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2.5 !py-1 text-xs w-full justify-start border border-line/60"
                        disabled={busyId === p.id}
                        onClick={() => recalcPrice(p.id)}
                      >
                        {t("products.recalcPrice")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2.5 !py-1 text-xs w-full justify-start border border-brand-200 text-brand-600"
                        disabled={busyId === p.id}
                        onClick={() => setTestStatus(p.id, "candidate")}
                      >
                        {t("testStatus.markCandidate")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2.5 !py-1 text-xs w-full justify-start border border-danger-500/20 text-danger-500"
                        disabled={busyId === p.id}
                        onClick={() => removeProduct(p.id)}
                      >
                        {t("products.delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );})}
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
