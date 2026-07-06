"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Card, Input, Select, Button, Spinner, ErrorBanner } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import type { PlatformSettings } from "@/types";

export default function SettingsPage() {
  const { t, setLocale } = useI18n();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setLocale(updated.language as any);
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title={t("settings.title")} subtitle={t("settings.subtitle")}>
      {error && <ErrorBanner message={error} />}
      {!settings && !error && <Spinner />}

      {settings && (
        <Card className="p-5 max-w-lg">
          <div className="space-y-4">
            <Input
              label={t("settings.companyName")}
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
            />
            <Select
              label={t("settings.language")}
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            >
              <option value="ru">{t("settings.langRu")}</option>
              <option value="kz">{t("settings.langKz")}</option>
              <option value="en">{t("settings.langEn")}</option>
            </Select>
            <Select
              label={t("settings.currency")}
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            >
              <option value="KZT">{t("settings.currencyKzt")}</option>
              <option value="USD">{t("settings.currencyUsd")}</option>
              <option value="RUB">{t("settings.currencyRub")}</option>
            </Select>
            <Input
              label={t("settings.defaultMarkup")}
              type="number"
              value={settings.default_markup_percent}
              onChange={(e) => setSettings({ ...settings, default_markup_percent: Number(e.target.value) })}
            />
            <Select
              label={t("settings.plan")}
              value={settings.plan}
              onChange={(e) => setSettings({ ...settings, plan: e.target.value })}
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="business">Business</option>
            </Select>
            <p className="text-xs text-ink-500 -mt-2">
              {t("settings.planReservedHint")}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
              {saved && <span className="text-sm text-profit-500">{t("settings.saved")}</span>}
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
