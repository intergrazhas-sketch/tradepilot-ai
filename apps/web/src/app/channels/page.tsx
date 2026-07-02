"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, StatusBadge, Spinner, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import type { Channel } from "@/types";

const CHANNEL_ICONS: Record<string, string> = {
  "Kaspi.kz": "🟢",
  "Wildberries": "🟣",
  "Ozon": "🔵",
  "Shopify": "🟩",
  "WooCommerce": "🟪",
  "Instagram": "📷",
  "TikTok Shop": "🎵",
  "Custom API": "⚙️",
};

export default function ChannelsPage() {
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listChannels().then(setChannels).catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell title={t("channels.title")} subtitle={t("channels.subtitle")}>
      {error && <ErrorBanner message={error} />}
      {!channels && !error && <Spinner />}

      {channels && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {channels.map((c) => (
            <Card key={c.id} className="p-4 flex flex-col items-start gap-3">
              <div className="text-2xl">{CHANNEL_ICONS[c.name] || "🔗"}</div>
              <div>
                <div className="font-medium text-ink-900 text-sm">{c.name}</div>
                <div className="text-xs text-ink-500 capitalize">{c.type.replace("_", " ")}</div>
              </div>
              <StatusBadge status={c.status} />
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-500 mt-6">
        Реальные интеграции с маркетплейсами появятся в следующих версиях. Модель данных уже готова для подключения.
      </p>
    </PageShell>
  );
}
