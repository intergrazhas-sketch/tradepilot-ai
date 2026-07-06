"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Select, Spinner, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import { emptyDisplay } from "@/lib/app-text";
import type { Product } from "@/types";

export default function AIStudioPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const load = () => api.listProducts().then((ps) => {
    setProducts(ps);
    if (!selectedId && ps[0]) setSelectedId(ps[0].id);
  }).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const selected = products.find((p) => p.id === selectedId) || null;

  const run = async (action: "title" | "description" | "category" | "price" | "full") => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "full") {
        const res = await api.aiFullOptimize(selectedId);
        setResult(res);
      } else if (action === "title") {
        const res = await api.aiImproveTitle(selectedId);
        setResult((prev: any) => ({ ...prev, title: res }));
      } else if (action === "description") {
        const res = await api.aiImproveDescription(selectedId);
        setResult((prev: any) => ({ ...prev, description: res }));
      } else if (action === "category") {
        const res = await api.aiSuggestCategory(selectedId);
        setResult((prev: any) => ({ ...prev, category: res }));
      } else if (action === "price") {
        const res = await api.aiSuggestPrice(selectedId);
        setResult((prev: any) => ({ ...prev, price: res }));
      }
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t("aiStudio.title")} subtitle={t("aiStudio.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <Card className="p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <Select
            label={t("aiStudio.selectProduct")}
            value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setResult(null); }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name_ai || p.name_raw} · {p.sku}</option>
            ))}
          </Select>
          <Button onClick={() => run("full")} disabled={busy || !selectedId}>
            ✨ {busy ? t("common.loading") : t("aiStudio.fullOptimize")}
          </Button>
        </div>

        {selected && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="secondary" className="text-xs" onClick={() => run("title")} disabled={busy}>{t("aiStudio.improveTitle")}</Button>
            <Button variant="secondary" className="text-xs" onClick={() => run("description")} disabled={busy}>{t("aiStudio.improveDescription")}</Button>
            <Button variant="secondary" className="text-xs" onClick={() => run("category")} disabled={busy}>{t("aiStudio.suggestCategory")}</Button>
            <Button variant="secondary" className="text-xs" onClick={() => run("price")} disabled={busy}>{t("aiStudio.suggestPrice")}</Button>
          </div>
        )}
      </Card>

      {busy && <Spinner />}

      {selected && !busy && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-3 text-sm">{t("aiStudio.before")}</h3>
            <div className="space-y-3 text-sm">
              <Field label={t("products.name")} value={selected.name_raw} />
              <Field label={t("products.description")} value={emptyDisplay(t, selected.description_raw)} multiline />
              <Field label={t("products.filterByCategory")} value={emptyDisplay(t, selected.category)} />
              <Field label={t("products.price")} value={formatMoney(selected.cost_price, selected.currency)} />
            </div>
          </Card>

          <Card className="p-5 border-brand-200 ring-1 ring-brand-100">
            <h3 className="font-semibold text-brand-700 mb-3 text-sm flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
              {t("aiStudio.after")}
            </h3>
            <div className="space-y-3 text-sm">
              <Field label={t("products.name")} value={result?.title?.after || selected.name_ai || "—"} highlight />
              <Field label={t("products.description")} value={emptyDisplay(t, result?.description?.after || selected.description_ai)} multiline highlight />
              <Field label={t("products.filterByCategory")} value={emptyDisplay(t, result?.category?.suggested_category || selected.category)} highlight />
              <Field
                label={t("products.price")}
                value={
                  result?.price
                    ? `${formatMoney(result.price.recommended_price, selected.currency)} (${t("aiStudio.marginSuffix").replace("{margin}", formatPercent(result.price.margin_percent))})`
                    : formatMoney(selected.selling_price, selected.currency)
                }
                highlight
              />
              {result?.price?.explanation && (
                <p className="text-xs text-ink-500 pt-1">{result.price.explanation}</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}

function Field({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-ink-500 mb-1">{label}</div>
      <div className={`${multiline ? "leading-relaxed" : ""} ${highlight ? "text-ink-900 font-medium" : "text-ink-700"}`}>
        {value}
      </div>
    </div>
  );
}
