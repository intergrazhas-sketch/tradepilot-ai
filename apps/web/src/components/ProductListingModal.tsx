"use client";

import { useEffect, useState } from "react";
import { Modal, Button, Input, Textarea, Select, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { displayCatalogProductTitle, displayListingDescription, displayListingTitle } from "@/lib/product-display";
import { api } from "@/lib/api";
import type { Product, ProductListing } from "@/types";

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const LOCALE_LABELS: Record<string, string> = { ru: "RU", en: "EN", kz: "KZ" };

export function ProductListingModal({ product, open, onClose, onSaved }: Props) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    listing_title: "",
    listing_description: "",
    listing_bullets: "",
    listing_keywords: "",
    listing_status: "draft" as Product["listing_status"],
    listing_notes: "",
  });
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !open) return;
    setError(null);
    api.getProductListing(product.id)
      .then((l) => {
        setForm({
          listing_title: l.listing_title || "",
          listing_description: l.listing_description || "",
          listing_bullets: (l.listing_bullets || []).join("\n"),
          listing_keywords: (l.listing_keywords || []).join(", "),
          listing_status: l.listing_status,
          listing_notes: l.listing_notes || "",
        });
        setScore(l.listing_score);
      })
      .catch((e) => setError(e.message));
  }, [product, open]);

  const generate = async () => {
    if (!product) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateProductListing(product.id);
      const p = res.product;
      setForm({
        listing_title: p.listing_title || "",
        listing_description: p.listing_description || "",
        listing_bullets: (p.listing_bullets || []).join("\n"),
        listing_keywords: (p.listing_keywords || []).join(", "),
        listing_status: p.listing_status || "draft",
        listing_notes: p.listing_notes || "",
      });
      setScore(p.listing_score || 0);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const bullets = form.listing_bullets.split("\n").map((s) => s.trim()).filter(Boolean);
      const keywords = form.listing_keywords.split(",").map((s) => s.trim()).filter(Boolean);
      const updated = await api.updateProductListing(product.id, {
        listing_title: form.listing_title || undefined,
        listing_description: form.listing_description || undefined,
        listing_bullets: bullets,
        listing_keywords: keywords,
        listing_status: form.listing_status,
        listing_notes: form.listing_notes || undefined,
      });
      setScore(updated.listing_score);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title={t("listing.editorTitle")}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {error && <ErrorBanner message={error} />}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-600">{displayCatalogProductTitle(product, locale)}</span>
          <span className="font-semibold text-brand-600">{t("listing.score")}: {score}</span>
        </div>
        <div className="space-y-1">
          <Button variant="secondary" onClick={generate} disabled={generating} className="w-full">
            {generating ? t("common.loading") : t("listing.generate")}
          </Button>
          <p className="text-xs text-ink-500 text-center">
            {t("listing.generateHint").replace("{locale}", LOCALE_LABELS[locale] || locale.toUpperCase())}
          </p>
        </div>
        <Input label={t("listing.title")} value={form.listing_title} onChange={(e) => setForm({ ...form, listing_title: e.target.value })} />
        <Textarea label={t("listing.description")} rows={4} value={form.listing_description} onChange={(e) => setForm({ ...form, listing_description: e.target.value })} />
        <Textarea label={t("listing.bullets")} rows={4} value={form.listing_bullets} onChange={(e) => setForm({ ...form, listing_bullets: e.target.value })} placeholder={t("listing.bulletsHint")} />
        <Input label={t("listing.keywords")} value={form.listing_keywords} onChange={(e) => setForm({ ...form, listing_keywords: e.target.value })} placeholder={t("listing.keywordsHint")} />
        <Select label={t("listing.status")} value={form.listing_status} onChange={(e) => setForm({ ...form, listing_status: e.target.value as Product["listing_status"] })}>
          <option value="draft">{t("listing.statusDraft")}</option>
          <option value="needs_review">{t("listing.statusNeedsReview")}</option>
          <option value="ready">{t("listing.statusReady")}</option>
        </Select>
        <Textarea label={t("listing.notes")} rows={2} value={form.listing_notes} onChange={(e) => setForm({ ...form, listing_notes: e.target.value })} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function listingStatusLabel(t: (k: string) => string, status?: string) {
  if (status === "ready") return t("listing.statusReady");
  if (status === "needs_review") return t("listing.statusNeedsReview");
  return t("listing.statusDraft");
}

export { displayListingTitle as productDisplayTitle, displayListingDescription as productDisplayDescription } from "@/lib/product-display";
