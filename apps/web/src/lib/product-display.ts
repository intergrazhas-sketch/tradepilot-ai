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
  headphones: { ru: "наушники", en: "headphones", kz: "құлаққап" },
  құлаққап: { ru: "наушники", en: "headphones", kz: "құлаққап" },
  bluetooth: { ru: "Bluetooth", en: "Bluetooth", kz: "Bluetooth" },
  tws: { ru: "TWS", en: "TWS", kz: "TWS" },
  беспроводные: { ru: "беспроводные", en: "wireless", kz: "сымсыз" },
  wireless: { ru: "беспроводные", en: "wireless", kz: "сымсыз" },
  набор: { ru: "набор", en: "set", kz: "жинағы" },
  кастрюль: { ru: "кастрюль", en: "cookware", kz: "кәстрөл" },
  cookware: { ru: "кастрюль", en: "cookware", kz: "кәстрөл" },
  предмета: { ru: "предмета", en: "piece", kz: "дана" },
  piece: { ru: "предмета", en: "piece", kz: "дана" },
  pieces: { ru: "предметов", en: "pieces", kz: "дана" },
};

const CATEGORY_MAP: Record<string, Record<Locale, string>> = {
  электроника: { ru: "Электроника", en: "Electronics", kz: "Техника" },
  electronics: { ru: "Электроника", en: "Electronics", kz: "Техника" },
  техника: { ru: "Электроника", en: "Electronics", kz: "Техника" },
  "дом и быт": { ru: "Дом и быт", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "дом и кухня": { ru: "Дом и кухня", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "home & kitchen": { ru: "Дом и быт", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "home and kitchen": { ru: "Дом и быт", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "үй және асхана": { ru: "Үй және асхана", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  "үй және тұрмыс": { ru: "Дом и быт", en: "Home & kitchen", kz: "Үй және тұрмыс" },
  одежда: { ru: "Одежда", en: "Fashion", kz: "Киім" },
  аксессуары: { ru: "Аксессуары", en: "Accessories", kz: "Аксессуарлар" },
};

type ProductLike = Pick<Product, "listing_title" | "listing_description" | "name_raw" | "brand" | "category">;

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

function phraseVariants(key: string, translations: Record<Locale, string>): string[] {
  return [key, normKey(translations.ru), normKey(translations.en), normKey(translations.kz)];
}

function findPhraseTranslation(text: string, locale: Locale): string {
  if (!text.trim()) return "";
  const normalized = normKey(text);

  for (const [key, translations] of Object.entries(PHRASE_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    if (phraseVariants(key, translations).some((variant) => variant && (normalized === variant || normalized.includes(variant)))) {
      return translations[locale];
    }
  }

  if (locale === "ru") return cleanText(text);

  let result = cleanText(text);
  for (const [wordKey, translations] of Object.entries(WORD_MAP)) {
    result = result.replace(new RegExp(`\\b${wordKey}\\b`, "gi"), translations[locale]);
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

export function localizeCategory(category: string | null | undefined, locale: Locale): string {
  if (!category?.trim()) return "";
  const key = normKey(category);

  for (const [mapKey, translations] of Object.entries(CATEGORY_MAP)) {
    const variants = [mapKey, normKey(translations.ru), normKey(translations.en), normKey(translations.kz)];
    if (variants.includes(key)) {
      return translations[locale];
    }
  }

  return locale === "ru" ? category.trim() : category.trim();
}

export function localizePhrase(text: string | null | undefined, locale: Locale): string {
  if (!text?.trim()) return "";
  return findPhraseTranslation(text, locale);
}

function localizeCompositeLabel(text: string, locale: Locale): string {
  if (!text.trim()) return "";

  const parts = text.split(/\s*[—–-]\s*/);
  if (parts.length >= 2) {
    const head = findPhraseTranslation(parts[0], locale);
    const tailSource = parts.slice(1).join(" — ");
    const tail = localizeCategory(tailSource, locale) || findPhraseTranslation(tailSource, locale);
    return `${head} — ${tail}`;
  }

  return findPhraseTranslation(text, locale);
}

function buildCatalogTitleFromRaw(
  nameRaw: string,
  brand: string | null | undefined,
  category: string | null | undefined,
  locale: Locale,
): string {
  let namePart = findPhraseTranslation(nameRaw, locale);
  const brandVal = brand?.trim();

  if (brandVal && !namePart.toLowerCase().includes(brandVal.toLowerCase())) {
    namePart = `${brandVal} ${namePart}`;
  }

  const cat = localizeCategory(category, locale);
  if (cat && !normKey(namePart).includes(normKey(cat))) {
    return `${namePart} — ${cat}`;
  }

  return namePart;
}

/** Catalog screens: always derive display from raw product facts + current UI locale. */
export function displayCatalogProductTitle(
  product: Pick<Product, "name_raw" | "brand" | "category">,
  locale: Locale,
): string {
  const nameRaw = product.name_raw?.trim();
  if (!nameRaw) return "";
  return buildCatalogTitleFromRaw(nameRaw, product.brand, product.category, locale);
}

/** Backward-compatible alias for catalog screens. */
export function displayProductTitle(
  product: Pick<Product, "name_raw" | "brand" | "category">,
  locale: Locale,
): string {
  return displayCatalogProductTitle(product, locale);
}

export function displayProductCategory(
  product: Pick<Product, "category">,
  locale: Locale,
): string {
  return localizeCategory(product.category, locale);
}

/** Listing Ready / Storefront: show saved listing card text when present. */
export function displayListingTitle(product: ProductLike, locale: Locale): string {
  if (product.listing_title?.trim()) {
    return product.listing_title.trim();
  }
  return displayCatalogProductTitle(product, locale);
}

export function displayListingDescription(
  product: Pick<Product, "listing_description" | "description_raw">,
  locale: Locale,
): string {
  if (product.listing_description?.trim()) {
    return product.listing_description.trim();
  }
  const source = product.description_raw?.trim();
  if (!source) return "";
  return localizePhrase(source, locale);
}

/** Orders and other snapshots that may contain a previously generated title. */
export function displayOrderProductName(name: string | null | undefined, locale: Locale): string {
  if (!name?.trim()) return "";
  return localizeCompositeLabel(name.trim(), locale);
}

/** Any product name string from analytics/API snapshots. */
export function displayProductNameSnapshot(name: string | null | undefined, locale: Locale): string {
  return displayOrderProductName(name, locale);
}

export function displayProductSubtitle(
  product: Pick<Product, "description_raw" | "listing_description">,
  locale: Locale,
): string {
  if (product.listing_description?.trim()) {
    return product.listing_description.trim();
  }
  const source = product.description_raw?.trim();
  if (!source) return "";
  return localizePhrase(source, locale);
}
