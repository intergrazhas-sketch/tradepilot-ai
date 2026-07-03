"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Modal, Input, Textarea, Select, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import type { SupplierSearchRequest, SupplierLead } from "@/types";

const EMPTY_REQUEST = {
  category: "",
  country: "",
  city: "",
  language: "ru",
  search_goal: "",
  required_open_price_list: true,
  required_wholesale: true,
  min_score: "50",
  notes: "",
};

const EMPTY_RESULT = {
  name: "",
  website_url: "",
  source_url: "",
  contact_phone: "",
  contact_email: "",
  whatsapp: "",
  price_list_url: "",
  has_wholesale_terms: false,
  delivery_info: "",
  min_order_quantity: "",
  notes: "",
};

export default function SupplierSearchPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<SupplierSearchRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_REQUEST);
  const [resultForm, setResultForm] = useState(EMPTY_RESULT);
  const [resultOpen, setResultOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastLead, setLastLead] = useState<SupplierLead | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const selected = requests?.find((r) => r.id === selectedId) ?? null;

  const load = useCallback(() => {
    api.listSupplierSearchRequests()
      .then((rows) => {
        setRequests(rows);
        setSelectedId((prev) => prev ?? rows[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const createRequest = async () => {
    if (!form.category.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await api.createSupplierSearchRequest({
        category: form.category.trim(),
        country: form.country || undefined,
        city: form.city || undefined,
        language: form.language,
        search_goal: form.search_goal || undefined,
        required_open_price_list: form.required_open_price_list,
        required_wholesale: form.required_wholesale,
        min_score: Number(form.min_score) || 50,
        notes: form.notes || undefined,
      });
      setForm(EMPTY_REQUEST);
      setSelectedId(created.id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateQueries = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.generateSupplierSearchQueries(selected.id);
      setRequests((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? [updated]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyQuery = async (q: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(q);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      setError(t("supplierSearch.copyFailed"));
    }
  };

  const submitResult = async () => {
    if (!selected || !resultForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.addSupplierSearchResult(selected.id, {
        name: resultForm.name.trim(),
        website_url: resultForm.website_url || undefined,
        source_url: resultForm.source_url || undefined,
        contact_phone: resultForm.contact_phone || undefined,
        contact_email: resultForm.contact_email || undefined,
        whatsapp: resultForm.whatsapp || undefined,
        price_list_url: resultForm.price_list_url || undefined,
        has_wholesale_terms: resultForm.has_wholesale_terms,
        delivery_info: resultForm.delivery_info || undefined,
        min_order_quantity: resultForm.min_order_quantity ? Number(resultForm.min_order_quantity) : undefined,
        notes: resultForm.notes || undefined,
      });
      setLastLead(res.lead);
      setResultForm(EMPTY_RESULT);
      setResultOpen(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: string) => {
    const key = `supplierSearch.status.${s}`;
    const label = t(key);
    return label === key ? s : label;
  };

  return (
    <PageShell
      title={t("supplierSearch.title")}
      subtitle={t("supplierSearch.subtitle")}
      actions={
        <Link href="/supplier-discovery">
          <Button variant="secondary">{t("nav.supplierDiscovery")}</Button>
        </Link>
      }
    >
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
        <Card className="p-5 h-fit">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">{t("supplierSearch.newRequest")}</h3>
          <div className="space-y-3">
            <Input
              label={t("products.filterByCategory")}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("supplierDiscovery.country")}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
              <Input
                label={t("suppliers.city")}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <Select
              label={t("settings.language")}
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="ru">RU</option>
              <option value="kz">KZ</option>
              <option value="en">EN</option>
            </Select>
            <Input
              label={t("supplierSearch.searchGoal")}
              value={form.search_goal}
              onChange={(e) => setForm({ ...form, search_goal: e.target.value })}
              placeholder={t("supplierSearch.searchGoalHint")}
            />
            <Input
              label={t("supplierSearch.minScore")}
              type="number"
              min={0}
              max={100}
              value={form.min_score}
              onChange={(e) => setForm({ ...form, min_score: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.required_open_price_list}
                onChange={(e) => setForm({ ...form, required_open_price_list: e.target.checked })}
              />
              {t("supplierSearch.requireOpenPrice")}
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.required_wholesale}
                onChange={(e) => setForm({ ...form, required_wholesale: e.target.checked })}
              />
              {t("supplierSearch.requireWholesale")}
            </label>
            <Textarea
              label={t("suppliers.notes")}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button onClick={createRequest} disabled={saving} className="w-full">
              {saving ? t("common.loading") : t("supplierSearch.createRequest")}
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">{t("supplierSearch.requestsList")}</h3>
            {!requests && !error && <Spinner />}
            {requests && requests.length === 0 && (
              <EmptyState title={t("common.empty")} hint={t("supplierSearch.emptyHint")} />
            )}
            <div className="space-y-2">
              {requests?.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedId(r.id); setLastLead(null); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedId === r.id
                      ? "border-brand-200 bg-brand-50"
                      : "border-line hover:bg-canvas"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink-900 truncate">{r.category}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink-600 shrink-0">
                      {statusLabel(r.status)}
                    </span>
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    {[r.city, r.country].filter(Boolean).join(", ") || "—"} · {r.language.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selected && (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-ink-900">{selected.category}</h3>
                  <p className="text-xs text-ink-500 mt-1">
                    {[selected.city, selected.country].filter(Boolean).join(", ") || "—"} · {selected.language.toUpperCase()} · {statusLabel(selected.status)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={generateQueries} disabled={busy}>
                    {busy ? t("common.loading") : t("supplierSearch.generateQueries")}
                  </Button>
                  <Button variant="secondary" onClick={() => setResultOpen(true)}>
                    + {t("supplierSearch.addFoundSupplier")}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-ink-500 mb-4">{t("supplierSearch.manualSearchHint")}</p>

              {lastLead && (
                <div className="mb-4 p-3 rounded-lg bg-profit-50 border border-profit-500/20 text-sm">
                  <span className="text-profit-600 font-medium">{t("supplierSearch.leadSaved")}: </span>
                  {lastLead.name} — score {lastLead.supplier_fit_score}
                  <Link href="/supplier-discovery" className="ml-2 text-brand-600 hover:underline text-xs">
                    {t("nav.supplierDiscovery")}
                  </Link>
                </div>
              )}

              {(selected.generated_queries?.length ?? 0) === 0 ? (
                <EmptyState title={t("supplierSearch.noQueries")} hint={t("supplierSearch.noQueriesHint")} />
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-ink-700">
                    {t("supplierSearch.generatedQueries")} ({selected.generated_queries!.length})
                  </h4>
                  {selected.generated_queries!.map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border border-line bg-canvas/50">
                      <code className="flex-1 text-xs text-ink-800 break-all leading-relaxed">{q}</code>
                      <Button
                        variant="ghost"
                        className="text-xs px-2 py-1 h-auto shrink-0 border border-line"
                        onClick={() => copyQuery(q, idx)}
                      >
                        {copiedIdx === idx ? t("supplierSearch.copied") : t("supplierSearch.copyQuery")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Modal open={resultOpen} onClose={() => setResultOpen(false)} title={t("supplierSearch.addFoundSupplier")}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input label={t("suppliers.name")} value={resultForm.name} onChange={(e) => setResultForm({ ...resultForm, name: e.target.value })} />
          <Input label={t("supplierDiscovery.website")} value={resultForm.website_url} onChange={(e) => setResultForm({ ...resultForm, website_url: e.target.value })} />
          <Input label={t("supplierSearch.sourceUrl")} value={resultForm.source_url} onChange={(e) => setResultForm({ ...resultForm, source_url: e.target.value })} />
          <Input label={t("supplierDiscovery.priceListUrl")} value={resultForm.price_list_url} onChange={(e) => setResultForm({ ...resultForm, price_list_url: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("suppliers.phone")} value={resultForm.contact_phone} onChange={(e) => setResultForm({ ...resultForm, contact_phone: e.target.value })} />
            <Input label={t("suppliers.email")} value={resultForm.contact_email} onChange={(e) => setResultForm({ ...resultForm, contact_email: e.target.value })} />
          </div>
          <Input label="WhatsApp" value={resultForm.whatsapp} onChange={(e) => setResultForm({ ...resultForm, whatsapp: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={resultForm.has_wholesale_terms}
              onChange={(e) => setResultForm({ ...resultForm, has_wholesale_terms: e.target.checked })}
            />
            {t("supplierDiscovery.wholesaleTerms")}
          </label>
          <Input label={t("supplierDiscovery.moq")} type="number" min={0} value={resultForm.min_order_quantity} onChange={(e) => setResultForm({ ...resultForm, min_order_quantity: e.target.value })} />
          <Input label={t("supplierDiscovery.delivery")} value={resultForm.delivery_info} onChange={(e) => setResultForm({ ...resultForm, delivery_info: e.target.value })} />
          <Textarea label={t("suppliers.notes")} rows={2} value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setResultOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submitResult} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
