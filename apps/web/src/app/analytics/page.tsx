"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, StatCard, Spinner, ErrorBanner, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import { formatMoney, formatPercent } from "@/lib/format";
import type { ProfitAnalytics } from "@/types";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [data, setData] = useState<ProfitAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.profitAnalytics().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell title={t("analytics.title")} subtitle={t("analytics.subtitle")}>
      {error && <ErrorBanner message={error} />}
      {!data && !error && <Spinner />}

      {data && (
        <div className="space-y-6">
          <Card className="p-5 bg-canvas/40">
            <h3 className="font-semibold text-ink-900 mb-2">{t("analytics.whatShows")}</h3>
            <p className="text-sm text-ink-500 mb-3">{t("analytics.whatShowsIntro")}</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-ink-700">
              <li>• {t("analytics.explainRevenue")}</li>
              <li>• {t("analytics.explainCost")}</li>
              <li>• {t("analytics.explainProfit")}</li>
              <li>• {t("analytics.explainMargin")}</li>
              <li>• {t("analytics.explainTopProfit")}</li>
              <li>• {t("analytics.explainLowMargin")}</li>
            </ul>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={t("dashboard.revenue")} value={formatMoney(data.revenue)} />
            <StatCard label={t("analytics.cost")} value={formatMoney(data.cost)} />
            <StatCard label={t("dashboard.profit")} value={formatMoney(data.profit)} accent="profit" />
            <StatCard label={t("dashboard.avgMargin")} value={formatPercent(data.average_margin_percent)} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-ink-900 mb-4">{t("analytics.topProfit")}</h3>
              {data.top_profit_products.length === 0 ? <EmptyState title={t("common.empty")} /> : (
                <ul className="space-y-2.5">
                  {data.top_profit_products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-700 truncate max-w-[60%]">{p.name}</span>
                      <span className="text-profit-500 font-medium">{formatPercent(p.margin_percent)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-ink-900 mb-4">{t("analytics.lowMargin")}</h3>
              {data.low_margin_products.length === 0 ? <EmptyState title={t("common.empty")} /> : (
                <ul className="space-y-2.5">
                  {data.low_margin_products.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-700 truncate max-w-[60%]">{p.name}</span>
                      <span className="text-warn-500 font-medium">{formatPercent(p.margin_percent)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
