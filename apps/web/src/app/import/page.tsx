"use client";

import { useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Select, Spinner, ErrorBanner, StatusBadge } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Supplier, ImportPreviewResponse } from "@/types";

const SAMPLE_CSV = `sku,name,description,category,brand,cost_price,stock_quantity,currency,image_url
EL-9001,Bluetooth наушники TWS,Беспроводные наушники с кейсом,Электроника,SoundMax,4500,20,KZT,
HM-9002,Набор кастрюль 3 предмета,Антипригарное покрытие,Дом и быт,HomeStyle,12000,5,KZT,`;

export default function ImportPage() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listSuppliers().then((s) => {
      setSuppliers(s);
      if (s[0]) setSupplierId(s[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.importPreview(file);
      setPreview(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!preview || !supplierId) return;
    setLoading(true);
    try {
      const res = await api.importCommit(supplierId, preview.rows);
      setResult(res);
      setPreview(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tradepilot-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell title={t("import.title")} subtitle={t("import.subtitle")}>
      {error && <ErrorBanner message={error} />}

      <Card className="p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <Select label={t("import.selectSupplier")} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.length === 0 && <option value="">Сначала добавьте поставщика</option>}
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={downloadSample}>{t("import.formatHint")}</Button>
            <Button onClick={() => fileInput.current?.click()} disabled={!supplierId}>
              {t("import.uploadCsv")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Поля CSV: sku, name, description, category, brand, cost_price, stock_quantity, currency, image_url
        </p>
      </Card>

      {loading && <Spinner />}

      {result && (
        <Card className="p-5 mb-6 bg-profit-50 border-profit-500/20">
          <p className="text-sm text-profit-500 font-medium">
            Импортировано {result.imported} товар(ов). Откройте раздел "Товары", чтобы их увидеть.
          </p>
        </Card>
      )}

      {preview && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <div className="text-sm text-ink-700">
              {preview.total_rows} {t("import.rows")} ·{" "}
              <span className="text-profit-500 font-medium">{preview.valid_rows} {t("import.valid")}</span>
              {preview.invalid_rows > 0 && (
                <> · <span className="text-danger-500 font-medium">{preview.invalid_rows} {t("import.invalid")}</span></>
              )}
            </div>
            <Button onClick={commit} disabled={loading || preview.valid_rows === 0}>
              {t("import.commit")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-500">
                  <th className="px-4 py-2.5 font-medium">SKU</th>
                  <th className="px-4 py-2.5 font-medium">Название</th>
                  <th className="px-4 py-2.5 font-medium">Категория</th>
                  <th className="px-4 py-2.5 font-medium">Закупка</th>
                  <th className="px-4 py-2.5 font-medium">Рек. цена</th>
                  <th className="px-4 py-2.5 font-medium">Остаток</th>
                  <th className="px-4 py-2.5 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-line last:border-0 ${!row.valid ? "bg-danger-50/40" : ""}`}>
                    <td className="px-4 py-2.5 text-ink-700">{row.sku || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-ink-700">{row.category || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-700">{formatMoney(row.cost_price, row.currency)}</td>
                    <td className="px-4 py-2.5 text-ink-900">{formatMoney(row.suggested_selling_price, row.currency)}</td>
                    <td className="px-4 py-2.5 text-ink-700">{row.stock_quantity}</td>
                    <td className="px-4 py-2.5">
                      {row.valid ? <StatusBadge status="active" /> : (
                        <span className="text-xs text-danger-500">{row.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
