"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Modal, Input, Textarea, StatusBadge, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import type { Supplier } from "@/types";

const EMPTY_FORM = { name: "", contact_name: "", phone: "", email: "", country: "", city: "", notes: "" };

export default function SuppliersPage() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => api.listSuppliers().then(setSuppliers).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.createSupplier(form);
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
      title={t("suppliers.title")}
      subtitle={t("suppliers.subtitle")}
      actions={<Button onClick={() => setOpen(true)}>+ {t("suppliers.addSupplier")}</Button>}
    >
      {error && <ErrorBanner message={error} />}
      {!suppliers && !error && <Spinner />}

      {suppliers && suppliers.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("suppliers.addSupplier")} /></Card>
      )}

      {suppliers && suppliers.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("suppliers.name")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers.contact")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers.phone")}</th>
                <th className="px-4 py-3 font-medium">{t("suppliers.city")}</th>
                <th className="px-4 py-3 font-medium">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-4 py-3 font-medium text-ink-900">{s.name}</td>
                  <td className="px-4 py-3 text-ink-700">{s.contact_name || "—"}</td>
                  <td className="px-4 py-3 text-ink-700">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink-700">{s.city || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t("suppliers.addSupplier")}>
        <div className="space-y-3">
          <Input label={t("suppliers.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("suppliers.contact")} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <Input label={t("suppliers.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("suppliers.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t("suppliers.city")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <Textarea label={t("suppliers.notes")} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
