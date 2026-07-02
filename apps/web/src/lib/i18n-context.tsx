"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import ru from "@/i18n/ru.json";
import en from "@/i18n/en.json";
import kz from "@/i18n/kz.json";

export type Locale = "ru" | "kz" | "en";

const dictionaries: Record<Locale, Record<string, string>> = { ru, en, kz };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "tradepilot.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && dictionaries[stored]) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const t = useMemo(() => {
    const dict = dictionaries[locale];
    return (key: string) => dict[key] ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
