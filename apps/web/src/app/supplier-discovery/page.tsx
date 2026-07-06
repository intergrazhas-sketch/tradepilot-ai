"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Modal, Input, Textarea, StatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { statusLabel as resolveStatusLabel, translateSupplierFitReason } from "@/lib/app-text";
import type { SupplierLead, SupplierLeadFilter } from "@/types";

const FILTERS: SupplierLeadFilter[] = ["all", "open_price", "wholesale", "high_score", "new", "rejected"];

const EMPTY_FORM = {
  name: "",
  website_url: "",
  category: "",
  country: "",
  city: "",
  contact_phone: "",
  contact_email: "",
  whatsapp: "",
  price_list_url: "",
  has_wholesale_terms: false,
  delivery_info: "",
  min_order_quantity: "",
  notes: "",
};

export default function SupplierDiscoveryPage() {
  const { t } = useI18n();
  const [leads, setLeads] = useState<SupplierLead[] | null>(null);
  const [filter, setFilter] = useState<SupplierLeadFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api.listSupplierLeads(filter).then(setLeads).catch((e) => setError(e.message));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.createSupplierLead({
        name: form.name.trim(),
        website_url: form.website_url || undefined,
        category: form.category || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined,
        whatsapp: form.whatsapp || undefined,
        price_list_url: form.price_list_url || undefined,
        has_open_price_list: Boolean(form.price_list_url.trim()),
        has_wholesale_terms: form.has_wholesale_terms,
        delivery_info: form.delivery_info || undefined,
        min_order_quantity: form.min_order_quantity ? Number(form.min_order_quantity) : undefined,
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

  const convert = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.convertLeadToSupplier(id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.updateSupplierLead(id, { discovery_status: "rejected" });
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: string) => {
    const key = `discoveryStatus.${s}`;
    const label = t(key);
    return label === key ? s : label;
  };

  const filterLabel = (f: SupplierLeadFilter) => {
    const key = `supplierDiscovery.filter.${f}`;
    const label = t(key);
    return label === key ? f : label;
  };

  const location = (l: SupplierLead) => [l.city, l.country].filter(Boolean).join(", ") || "—";

  return (
    <PageShell
      title={t("supplierDiscovery.title")}
      subtitle={t("supplierDiscovery.subtitle")}
      actions={<Button onClick={() => setOpen(true)}>+ {t("supplierDiscovery.addLead")}</Button>}
    >
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
              filter === f
                ? "bg-brand-50 border-brand-200 text-brand-700 font-medium"
                : "border-line text-ink-600 hover:bg-canvas"
            }`}
          >
            {filterLabel(f)}
          </button>
        ))}
      </div>

      {!leads && !error && <Spinner />}
      {leads && leads.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("supplierDiscovery.emptyHint")} /></Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {leads?.map((l) => (
          <Card key={l.id} className="p-4 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-ink-900">{l.name}</div>
              <span className={`text-sm font-bold shrink-0 ${l.supplier_fit_score >= 70 ? "text-profit-500" : l.supplier_fit_score >= 40 ? "text-warn-500" : "text-ink-500"}`}>
                {l.supplier_fit_score}
              </span>
            </div>
            <div className="text-xs text-ink-500 mb-1">{l.category || "—"} · {location(l)}</div>
            {l.source === "supplier_search" && (
              <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 mb-2">
                {t("supplierDiscovery.sourceSearch")}
              </span>
            )}
            {l.website_url && (
              <a href={l.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline truncate mb-2">
                {l.website_url}
              </a>
            )}
            <div className="text-xs text-ink-600 space-y-0.5 mb-3">
              {l.contact_phone && <div>{t("suppliers.phone")}: {l.contact_phone}</div>}
              {l.contact_email && <div>{t("suppliers.email")}: {l.contact_email}</div>}
              {l.whatsapp && <div>{t("common.whatsapp")}: {l.whatsapp}</div>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {l.has_open_price_list && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-profit-50 text-profit-600">{t("supplierDiscovery.openPrice")}</span>
              )}
              {l.has_wholesale_terms && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600">{t("supplierDiscovery.wholesale")}</span>
              )}
              {l.min_order_quantity != null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink-600">{t("supplierDiscovery.moqBadge").replace("{qty}", String(l.min_order_quantity))}</span>
              )}
            </div>
            {l.supplier_fit_reason && (
              <p className="text-xs text-ink-500 mb-3 line-clamp-2">{translateSupplierFitReason(t, l.supplier_fit_reason)}</p>
            )}
            <div className="mb-3">
              <StatusBadge status={l.discovery_status} label={resolveStatusLabel(t, l.discovery_status, "discovery")} />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {l.discovery_status !== "added_to_suppliers" && l.discovery_status !== "rejected" && (
                <>
                  <Button
                    className="text-xs px-2 py-1 h-auto"
                    disabled={busyId === l.id}
                    onClick={() => convert(l.id)}
                  >
                    {t("supplierDiscovery.addToSuppliers")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-xs px-2 py-1 h-auto border border-line"
                    disabled={busyId === l.id}
                    onClick={() => reject(l.id)}
                  >
                    {t("supplierDiscovery.reject")}
                  </Button>
                </>
              )}
              {l.converted_supplier_id && (
                <Link href="/suppliers" className="text-xs text-brand-600 hover:underline self-center">
                  {t("supplierDiscovery.viewSupplier")}
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t("supplierDiscovery.addLead")}>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input label={t("suppliers.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t("supplierDiscovery.website")} value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("products.filterByCategory")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label={t("supplierDiscovery.priceListUrl")} value={form.price_list_url} onChange={(e) => setForm({ ...form, price_list_url: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("suppliers.city")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label={t("supplierDiscovery.country")} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("suppliers.phone")} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <Input label={t("suppliers.email")} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <Input label={t("common.whatsapp")} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.has_wholesale_terms}
              onChange={(e) => setForm({ ...form, has_wholesale_terms: e.target.checked })}
            />
            {t("supplierDiscovery.wholesaleTerms")}
          </label>
          <Input label={t("supplierDiscovery.moq")} type="number" min={0} value={form.min_order_quantity} onChange={(e) => setForm({ ...form, min_order_quantity: e.target.value })} />
          <Input label={t("supplierDiscovery.delivery")} value={form.delivery_info} onChange={(e) => setForm({ ...form, delivery_info: e.target.value })} />
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
