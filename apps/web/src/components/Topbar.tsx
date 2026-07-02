"use client";

import { ReactNode } from "react";
import { useI18n, Locale } from "@/lib/i18n-context";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "kz", label: "KZ" },
  { code: "en", label: "EN" },
];

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const { locale, setLocale } = useI18n();

  return (
    <header className="flex items-center justify-between gap-4 px-5 md:px-8 py-5 border-b border-line bg-canvas/80 backdrop-blur sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center rounded-full border border-line bg-surface p-0.5">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                locale === l.code ? "bg-brand-500 text-white" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
          ДС
        </div>
      </div>
    </header>
  );
}
