"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Card, Button, Select, Spinner, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Supplier, ImportPreviewResponse, ImportCommitResponse } from "@/types";

const SAMPLE_ROWS: string[][] = [
  ["sku", "name", "description", "category", "brand", "cost_price", "stock_quantity", "currency", "image_url"],
  ["EL-9001", "Bluetooth TWS Headphones", "Wireless earbuds with charging case", "Electronics", "SoundMax", "4500", "20", "KZT", ""],
  ["HM-9002", "Cookware Set 3 pcs", "Non-stick coating", "Home & Kitchen", "HomeStyle", "12000", "5", "KZT", ""],
];

const CSV_DELIMITER = ";";

function escapeCsvCell(value: string): string {
  if (value.includes(CSV_DELIMITER) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildSampleCsv(): string {
  return SAMPLE_ROWS.map((row) => row.map(escapeCsvCell).join(CSV_DELIMITER)).join("\r\n");
}

const ROW_STATUS_CLASS: Record<string, string> = {
  new: "bg-brand-50 text-brand-600",
  update: "bg-warn-50 text-warn-500",
  error: "bg-danger-50 text-danger-500",
};

export default function ImportPage() {
  const { t } = useI18n();

  const rowStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      new: t("import.rowStatusNew"),
      update: t("import.rowStatusUpdate"),
      error: t("import.rowStatusError"),
    };
    return map[status] || status;
  };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportCommitResponse | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listSuppliers().then((s) => {
      setSuppliers(s);
      if (s[0]) setSupplierId(s[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  const handleFile = async (file: File) => {
    if (!supplierId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.importPreview(supplierId, file);
      setPreview(res);
    } catch (e: any) {
      setError(e.message);
      setPreview(null);
    } finally {
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
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
    const bom = "\uFEFF";
    const blob = new Blob([bom + buildSampleCsv()], { type: "text/csv;charset=utf-8" });
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
        <h3 className="text-sm font-semibold text-ink-900 mb-2">{t("import.formatTitle")}</h3>
        <p className="text-xs text-ink-600 mb-3">{t("import.formatCsvXlsx")}</p>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-ink-700 mb-4">
          <div>
            <p className="font-medium text-ink-900 mb-1">{t("import.requiredFields")}</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{t("import.fieldSku")}</li>
              <li>{t("import.fieldName")}</li>
              <li>{t("import.fieldCost")}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-ink-900 mb-1">{t("import.recommendedFields")}</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>{t("import.fieldSell")}</li>
              <li>{t("import.fieldStock")}</li>
              <li>{t("import.fieldCategory")}</li>
              <li>{t("import.fieldBrand")}</li>
            </ul>
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-4 items-end">
          <Select label={t("import.selectSupplier")} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.length === 0 && <option value="">{t("import.noSupplierFirst")}</option>}
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={downloadSample}>{t("import.formatHint")}</Button>
            <Button onClick={() => fileInput.current?.click()} disabled={!supplierId}>
              {t("import.uploadFile")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        </div>
        <p className="text-xs text-ink-500 mt-3">{t("import.supportedFormats")}</p>
        <p className="text-xs text-ink-400 mt-1">{t("import.futureFormats")}</p>
        <p className="text-xs text-ink-500 mt-1">
          {t("import.columnsHint")}
        </p>
      </Card>

      {loading && <Spinner />}

      {result && (
        <Card className="p-5 mb-6 bg-profit-50 border-profit-500/20">
          <p className="text-sm text-profit-500 font-medium mb-2">{t("import.resultTitle")}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-ink-500">{t("import.added")}:</span> <strong>{result.added_count}</strong></div>
            <div><span className="text-ink-500">{t("import.updated")}:</span> <strong>{result.updated_count}</strong></div>
            <div><span className="text-ink-500">{t("import.skipped")}:</span> <strong>{result.skipped_count}</strong></div>
            <div><span className="text-ink-500">{t("import.errors")}:</span> <strong>{result.error_count}</strong></div>
          </div>
          {(result.good_count > 0 || result.risk_count > 0 || result.bad_count > 0) && (
            <div className="mt-4 pt-3 border-t border-profit-500/20">
              <p className="text-xs text-ink-600 mb-2">{t("import.decisionHint")}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-profit-500">{t("import.goodProducts")}:</span> <strong>{result.good_count}</strong></div>
                <div><span className="text-warn-500">{t("import.riskProducts")}:</span> <strong>{result.risk_count}</strong></div>
                <div><span className="text-danger-500">{t("import.badProducts")}:</span> <strong>{result.bad_count}</strong></div>
              </div>
            </div>
          )}
          <div className="mt-4">
            <Link href="/best-products"><Button>{t("import.nextStepBest")}</Button></Link>
          </div>
        </Card>
      )}

      {preview && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line gap-4 flex-wrap">
            <div className="text-sm text-ink-700">
              {preview.total_rows} {t("import.rows")} ·{" "}
              <span className="text-brand-600 font-medium">{preview.new_rows} {t("import.newRows")}</span>
              {" · "}
              <span className="text-warn-500 font-medium">{preview.update_rows} {t("import.updateRows")}</span>
              {preview.error_rows > 0 && (
                <> · <span className="text-danger-500 font-medium">{preview.error_rows} {t("import.invalid")}</span></>
              )}
            </div>
            <Button onClick={commit} disabled={loading || preview.valid_rows === 0}>
              {t("import.commit")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-500">
                  <th className="px-4 py-2.5 font-medium">{t("import.colSku")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("import.colName")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("import.colCategory")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("import.colCost")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("import.colSuggestedPrice")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("import.colStock")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className={`border-b border-line last:border-0 ${row.row_status === "error" ? "bg-danger-50/40" : ""}`}>
                    <td className="px-4 py-2.5 text-ink-700">{row.sku || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-ink-900">{row.name}</td>
                    <td className="px-4 py-2.5 text-ink-700">{row.category || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-700">{formatMoney(row.cost_price, row.currency)}</td>
                    <td className="px-4 py-2.5 text-ink-900">{formatMoney(row.suggested_selling_price, row.currency)}</td>
                    <td className="px-4 py-2.5 text-ink-700">{row.stock_quantity}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROW_STATUS_CLASS[row.row_status] || ""}`}>
                        {rowStatusLabel(row.row_status)}
                      </span>
                      {row.error && (
                        <div className="text-xs text-danger-600 mt-1 font-medium">
                          ⚠ {row.error}
                        </div>
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
