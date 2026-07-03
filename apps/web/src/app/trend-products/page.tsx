"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Modal, Input, Textarea, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { TrendProductLead, SupplierLead } from "@/types";

const EMPTY_FORM = {
  title: "",
  category: "",
  trend_score: "60",
  demand_reason: "",
  suggested_supplier_lead_id: "",
  notes: "",
};

export default function TrendProductsPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<TrendProductLead[] | null>(null);
  const [supplierLeads, setSupplierLeads] = useState<SupplierLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.listTrendProductLeads().then(setItems).catch((e) => setError(e.message));
    api.listSupplierLeads().then(setSupplierLeads).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createTrendProductLead({
        title: form.title.trim(),
        category: form.category || undefined,
        trend_score: Number(form.trend_score) || 60,
        demand_reason: form.demand_reason || undefined,
        suggested_supplier_lead_id: form.suggested_supplier_lead_id || undefined,
        notes: form.notes || undefined,
        source: "manual",
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title={t("trendProducts.title")}
      subtitle={t("trendProducts.subtitle")}
      actions={<Button onClick={() => setOpen(true)}>+ {t("trendProducts.addIdea")}</Button>}
    >
      {error && <ErrorBanner message={error} />}

      {!items && !error && <Spinner />}
      {items && items.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("trendProducts.emptyHint")} /></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items?.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-ink-900">{item.title}</div>
              <span className={`text-sm font-bold shrink-0 ${item.trend_score >= 70 ? "text-profit-500" : "text-warn-500"}`}>
                {item.trend_score}
              </span>
            </div>
            <div className="text-xs text-ink-500 mb-2">{item.category || "—"}</div>
            {item.demand_reason && (
              <p className="text-sm text-ink-700 mb-2">{item.demand_reason}</p>
            )}
            {item.notes && <p className="text-xs text-ink-500 mb-2">{item.notes}</p>}
            {item.supplier_lead_name && (
              <div className="text-xs text-brand-600 mb-2">
                {t("trendProducts.linkedSupplier")}: {item.supplier_lead_name}
              </div>
            )}
            <div className="text-[11px] text-ink-400">{formatDate(item.created_at)}</div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t("trendProducts.addIdea")}>
        <div className="space-y-3">
          <Input label={t("trendProducts.titleField")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label={t("products.filterByCategory")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label={t("trendProducts.score")} type="number" min={0} max={100} value={form.trend_score} onChange={(e) => setForm({ ...form, trend_score: e.target.value })} />
          <Textarea label={t("trendProducts.demandReason")} rows={2} value={form.demand_reason} onChange={(e) => setForm({ ...form, demand_reason: e.target.value })} />
          <div>
            <label className="block text-xs text-ink-500 mb-1">{t("trendProducts.linkedSupplier")}</label>
            <select
              value={form.suggested_supplier_lead_id}
              onChange={(e) => setForm({ ...form, suggested_supplier_lead_id: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-surface text-ink-900"
            >
              <option value="">—</option>
              {supplierLeads.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <Textarea label={t("suppliers.notes")} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
