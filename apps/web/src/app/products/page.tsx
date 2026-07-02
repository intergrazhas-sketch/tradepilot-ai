"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Input, Select, StatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Product, Supplier } from "@/types";

export default function ProductsPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    api.listProducts().then(setProducts).catch((e) => setError(e.message));
    api.listSuppliers().then(setSuppliers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

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
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.name_ai || p.name_raw} ${p.sku || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, supplierFilter, categoryFilter, search]);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name || "—";

  const profitHint = (gross: number) => {
    if (gross > 0) return { tone: "text-profit-500", label: t("products.profitPositive") };
    if (gross < 0) return { tone: "text-danger-500", label: t("products.profitNegative") };
    return { tone: "text-ink-500", label: t("products.profitZero") };
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

  return (
    <PageShell title={t("products.title")} subtitle={t("products.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-3 mb-4">
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
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {!products && !error && <Spinner />}
      {products && filtered.length === 0 && <Card><EmptyState title={t("common.empty")} /></Card>}

      {products && filtered.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("products.name")}</th>
                <th className="px-4 py-3 font-medium">{t("products.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("products.cost")}</th>
                <th className="px-4 py-3 font-medium">{t("products.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.profit")}</th>
                <th className="px-4 py-3 font-medium">{t("products.markup")}</th>
                <th className="px-4 py-3 font-medium">{t("products.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("products.stock")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 font-medium w-[172px]">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const gross = p.gross_profit ?? (p.selling_price - p.cost_price);
                const hint = profitHint(gross);
                return (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{p.name_ai || p.name_raw}</div>
                    <div className="text-xs text-ink-500">{p.sku || "—"} · {p.category || "Без категории"}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{supplierName(p.supplier_id)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatMoney(p.cost_price, p.currency)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{formatMoney(p.selling_price, p.currency)}</td>
                  <td className="px-4 py-3">
                    <div className={`font-medium ${hint.tone}`}>{formatMoney(gross, p.currency)}</div>
                    <div className={`text-[11px] mt-0.5 ${hint.tone}`}>{hint.label}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(p.markup_percent ?? 0)}</td>
                  <td className="px-4 py-3 text-ink-700">{formatPercent(p.margin_percent ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={p.stock_quantity <= 5 ? "text-warn-500 font-medium" : "text-ink-700"}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 w-[172px]">
                    <div className="flex flex-col gap-2 min-w-[156px]">
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1.5 text-xs w-full justify-start whitespace-normal text-left leading-snug"
                        disabled={busyId === p.id}
                        onClick={() => aiImprove(p.id)}
                      >
                        ✨ {t("products.aiImprove")}
                      </Button>
                      <Button
                        variant="ghost"
                        className="!px-2.5 !py-1.5 text-xs w-full justify-start whitespace-normal text-left leading-snug border border-line/60"
                        disabled={busyId === p.id}
                        onClick={() => recalcPrice(p.id)}
                      >
                        {t("products.recalcPrice")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </Card>
      )}
    </PageShell>
  );
}
