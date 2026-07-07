import type { Locale } from "@/lib/i18n-context";
import type { Product } from "@/types";

const NOISE_PATTERNS = [
  /\b(NEW|HOT|SALE|АКЦИЯ|ХИТ|ТОП)\b/gi,
  /!{2,}/g,
  /\*+/g,
  /#\w+/g,
];

const PHRASE_MAP: Record<string, Record<Locale, string>> = {
  "bluetooth наушники tws": {
    ru: "Bluetooth наушники TWS",
    en: "Bluetooth TWS headphones",
    kz: "Bluetooth TWS құлаққап",
  },
  "soundmax bluetooth наушники tws": {
    ru: "SoundMax Bluetooth наушники TWS",
    en: "SoundMax Bluetooth TWS headphones",
    kz: "SoundMax Bluetooth TWS құлаққап",
  },
  "набор кастрюль 3 предмета": {
    ru: "Набор кастрюль 3 предмета",
    en: "3-piece cookware set",
    kz: "3 дана кәстрөл жинағы",
  },
  "набор кастрюль 5 предметов": {
    ru: "Набор кастрюль 5 предметов",
    en: "5-piece cookware set",
    kz: "5 дана кәстрөл жинағы",
  },
  "беспроводные наушники с кейсом": {
    ru: "Беспроводные наушники с кейсом",
    en: "Wireless headphones with case",
    kz: "Қаптамасы бар сымсыз құлаққап",
  },
  "беспроводные наушники с чехлом": {
    ru: "Беспроводные наушники с чехлом",
    en: "Wireless headphones with case",
    kz: "Қаптамасы бар сымсыз құлаққап",
  },
};

const WORD_MAP: Record<string, Record<Locale, string>> = {
  наушники: { ru: "наушники", en: "headphones", kz: "құлаққап" },
  bluetooth: { ru: "Bluetooth", en: "Bluetooth", kz: "Bluetooth" },
  tws: { ru: "TWS", en: "TWS", kz: "TWS" },
  беспроводные: { ru: "беспроводные", en: "wireless", kz: "сымсыз" },
  набор: { ru: "набор", en: "set", kz: "жинағы" },
  кастрюль: { ru: "кастрюль", en: "cookware", kz: "кәстрөл" },
  предмета: { ru: "предмета", en: "piece", kz: "дана" },
  предметов: { ru: "предметов", en: "pieces", kz: "дана" },
};

const CATEGORY_MAP: Record<string, Record<Locale, string>> = {
  электроника: { ru: "Электроника", en: "Electronics", kz: "Техника" },
  "дом и быт": { ru: "Дом и быт", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "дом и кухня": { ru: "Дом и кухня", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "үй және асхана": { ru: "Үй және асхана", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  одежда: { ru: "Одежда", en: "Fashion", kz: "Киім" },
  аксессуары: { ru: "Аксессуары", en: "Accessories", kz: "Аксессуарлар" },
};

function normKey(text: string): string {
  let value = text.toLowerCase().trim();
  for (const pattern of NOISE_PATTERNS) {
    value = value.replace(pattern, " ");
  }
  return value.replace(/\s{2,}/g, " ").replace(/^[\s\-_,.]+|[\s\-_,.]+$/g, "");
}

function cleanText(text: string): string {
  let cleaned = (text || "").trim();
  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/^[\s\-_,.]+|[\s\-_,.]+$/g, "");
  if (cleaned) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

export function localizeCategory(category: string | null | undefined, locale: Locale): string {
  if (!category?.trim()) return "";
  if (locale === "ru") return category.trim();
  const mapped = CATEGORY_MAP[normKey(category)];
  return mapped?.[locale] ?? category.trim();
}

export function localizePhrase(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  if (locale === "ru") return cleanText(text);

  const normalized = normKey(text);
  for (const [phraseKey, translations] of Object.entries(PHRASE_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    if (normalized === phraseKey || normalized.includes(phraseKey)) {
      return translations[locale];
    }
  }

  let result = cleanText(text);
  for (const [wordKey, translations] of Object.entries(WORD_MAP)) {
    const replacement = translations[locale];
    result = result.replace(new RegExp(`\\b${wordKey}\\b`, "gi"), replacement);
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

function localizeCompositeLabel(text: string, locale: Locale): string {
  if (!text.trim() || locale === "ru") return text.trim();

  const parts = text.split(/\s*[—–-]\s*/);
  if (parts.length >= 2) {
    const head = localizePhrase(parts[0], locale);
    const tail = localizeCategory(parts.slice(1).join(" — "), locale) || localizePhrase(parts.slice(1).join(" "), locale);
    return `${head} — ${tail}`;
  }
  return localizePhrase(text, locale);
}

type ProductLike = Pick<Product, "listing_title" | "name_ai" | "name_raw" | "brand" | "category">;

export function displayProductTitle(product: ProductLike, locale: Locale): string {
  let source = (product.listing_title || product.name_ai || product.name_raw || "").trim();
  if (!source) return "";

  if (!product.listing_title && product.brand?.trim()) {
    const brand = product.brand.trim();
    if (!source.toLowerCase().includes(brand.toLowerCase())) {
      source = `${brand} ${source}`;
    }
  }

  return localizeCompositeLabel(source, locale);
}

export function displayProductCategory(
  product: Pick<Product, "category">,
  locale: Locale,
): string {
  return localizeCategory(product.category, locale);
}

export function displayProductSubtitle(
  product: Pick<Product, "description_raw" | "description_ai" | "listing_description">,
  locale: Locale,
): string {
  const source = (product.listing_description || product.description_ai || product.description_raw || "").trim();
  if (!source) return "";
  if (locale === "ru") return source;
  return localizePhrase(source, locale);
}

export function displayOrderProductName(name: string | null | undefined, locale: Locale): string {
  if (!name?.trim()) return "";
  return localizeCompositeLabel(name.trim(), locale);
}
