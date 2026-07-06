"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Spinner, EmptyState, ErrorBanner } from "@/components/ui";
import { ProductListingModal, listingStatusLabel, productDisplayTitle } from "@/components/ProductListingModal";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { Product, Supplier } from "@/types";

export default function ListingReadyPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listingProduct, setListingProduct] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    api.listListingReady().then(setProducts).catch((e) => setError(e.message));
    api.listSuppliers().then(setSuppliers).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const supplierName = (id?: string | null) => suppliers.find((s) => s.id === id)?.name || "—";

  const setTestLaunch = async (id: string) => {
    setBusyId(id);
    try {
      await api.testLaunchSelect(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const regenerateListing = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.generateProductListing(id);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell title={t("listing.readyTitle")} subtitle={t("listing.readySubtitle")}>
      {error && <ErrorBanner message={error} />}

      {!products && !error && <Spinner />}
      {products && products.length === 0 && (
        <Card><EmptyState title={t("common.empty")} hint={t("listing.readyEmpty")} /></Card>
      )}

      {products && products.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">{t("listing.title")}</th>
                <th className="px-4 py-3 font-medium">{t("products.price")}</th>
                <th className="px-4 py-3 font-medium">{t("products.margin")}</th>
                <th className="px-4 py-3 font-medium">{t("products.supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("listing.score")}</th>
                <th className="px-4 py-3 font-medium">{t("listing.status")}</th>
                <th className="px-4 py-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{productDisplayTitle(p)}</div>
                    <div className="text-xs text-ink-500 line-clamp-2 mt-0.5">{p.listing_description || "—"}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(p.selling_price, p.currency)}</td>
                  <td className="px-4 py-3">{formatPercent(p.margin_percent)}</td>
                  <td className="px-4 py-3 text-ink-700">{supplierName(p.supplier_id)}</td>
                  <td className="px-4 py-3 font-semibold text-brand-600">{p.listing_score ?? 0}</td>
                  <td className="px-4 py-3">{listingStatusLabel(t, p.listing_status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <Button className="text-xs px-2 py-1 h-auto" onClick={() => setListingProduct(p)}>
                        {t("common.edit")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1 h-auto"
                        disabled={busyId === p.id}
                        onClick={() => regenerateListing(p.id)}
                      >
                        {busyId === p.id ? t("common.loading") : t("listing.regenerate")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1 h-auto"
                        disabled={busyId === p.id}
                        onClick={() => setTestLaunch(p.id)}
                      >
                        {t("testLaunch.addToLaunch")}
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
