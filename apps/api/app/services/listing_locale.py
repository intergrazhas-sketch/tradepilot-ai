"""Rule-based localization for app-generated listing content (RU/KZ/EN)."""

from __future__ import annotations

import re

SUPPORTED_LOCALES = {"ru", "en", "kz"}

NOISE_PATTERNS = [
    r"\b(NEW|HOT|SALE|АКЦИЯ|ХИТ|ТОП)\b",
    r"!{2,}",
    r"\*+",
    r"#\w+",
]

# Exact phrase mappings (Russian/canonical source -> locale)
PHRASE_MAP: dict[str, dict[str, str]] = {
    "bluetooth наушники tws": {
        "ru": "Bluetooth наушники TWS",
        "en": "Bluetooth TWS headphones",
        "kz": "Bluetooth TWS құлаққап",
    },
    "набор кастрюль 3 предмета": {
        "ru": "Набор кастрюль 3 предмета",
        "en": "3-piece cookware set",
        "kz": "3 паралық кастрюль жиынтығы",
    },
    "набор кастрюль 5 предметов": {
        "ru": "Набор кастрюль 5 предметов",
        "en": "5-piece cookware set",
        "kz": "5 паралық кастрюль жиынтығы",
    },
    "беспроводные наушники с кейсом": {
        "ru": "Беспроводные наушники с кейсом",
        "en": "Wireless headphones with case",
        "kz": "Қаптамасы бар сымсыз құлаққап",
    },
    "беспроводные наушники с чехлом": {
        "ru": "Беспроводные наушники с чехлом",
        "en": "Wireless headphones with case",
        "kz": "Қаптамасы бар сымсыз құлаққап",
    },
    "набор кастрюль с антипригарным покрытием": {
        "ru": "Набор кастрюль с антипригарным покрытием",
        "en": "Cookware set with non-stick coating",
        "kz": "Жабындысы бар кастрюль жиынтығы",
    },
    "антипригарное покрытие": {
        "ru": "Антипригарное покрытие",
        "en": "Non-stick coating",
        "kz": "Жабындысы бар покрытие",
    },
}

WORD_MAP: dict[str, dict[str, str]] = {
    "наушники": {"ru": "наушники", "en": "headphones", "kz": "құлаққап"},
    "bluetooth": {"ru": "Bluetooth", "en": "Bluetooth", "kz": "Bluetooth"},
    "tws": {"ru": "TWS", "en": "TWS", "kz": "TWS"},
    "беспроводные": {"ru": "беспроводные", "en": "wireless", "kz": "сымсыз"},
    "беспроводной": {"ru": "беспроводной", "en": "wireless", "kz": "сымсыз"},
    "черные": {"ru": "черные", "en": "black", "kz": "қара"},
    "черный": {"ru": "черный", "en": "black", "kz": "қара"},
    "набор": {"ru": "набор", "en": "set", "kz": "жиынтық"},
    "кастрюль": {"ru": "кастрюль", "en": "cookware", "kz": "кастрюль"},
    "кастрюли": {"ru": "кастрюли", "en": "cookware", "kz": "кастрюль"},
    "предмета": {"ru": "предмета", "en": "piece", "kz": "дана"},
    "предметов": {"ru": "предметов", "en": "pieces", "kz": "дана"},
    "антипригарным": {"ru": "антипригарным", "en": "non-stick", "kz": "жабынды"},
    "антипригарное": {"ru": "антипригарное", "en": "non-stick", "kz": "жабынды"},
    "покрытием": {"ru": "покрытием", "en": "coating", "kz": "жабынды"},
    "покрытие": {"ru": "покрытие", "en": "coating", "kz": "жабынды"},
    "чехлом": {"ru": "чехлом", "en": "case", "kz": "қаптама"},
    "кейсом": {"ru": "кейсом", "en": "case", "kz": "қаптама"},
    "с": {"ru": "с", "en": "with", "kz": "бар"},
}

CATEGORY_MAP: dict[str, dict[str, str]] = {
    "электроника": {
        "ru": "Электроника",
        "en": "Electronics",
        "kz": "Техника",
    },
    "дом и быт": {
        "ru": "Дом и быт",
        "en": "Home & Kitchen",
        "kz": "Үй және асхана",
    },
    "одежда": {
        "ru": "Одежда",
        "en": "Fashion",
        "kz": "Киім",
    },
    "аксессуары": {
        "ru": "Аксессуары",
        "en": "Accessories",
        "kz": "Аксессуарлар",
    },
}

DESCRIPTION_COPY = {
    "ru": {
        "brand": "Бренд: {brand}.",
        "benefits": "Проверенное качество, аккуратная упаковка и быстрая отправка.",
        "fallback": "Надежный выбор по выгодной цене.",
    },
    "en": {
        "brand": "Brand: {brand}.",
        "benefits": "Trusted quality, neat packaging, and fast dispatch.",
        "fallback": "A reliable choice at a competitive price.",
    },
    "kz": {
        "brand": "Бренд: {brand}.",
        "benefits": "Сенімді сапа, ұқыпты орау және жылдам жіберу.",
        "fallback": "Тиімді бағада сенімді таңдау.",
    },
}


def normalize_locale(locale: str | None) -> str:
    value = (locale or "ru").lower().strip()
    return value if value in SUPPORTED_LOCALES else "ru"


def _norm_key(text: str) -> str:
    text = text.lower().strip()
    for pattern in NOISE_PATTERNS:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    return re.sub(r"\s{2,}", " ", text).strip(" -_,.")


def clean_raw_text(text: str) -> str:
    cleaned = (text or "").strip()
    for pattern in NOISE_PATTERNS:
        cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" -_,.")
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned


def localize_category(category: str | None, locale: str) -> str:
    if not category or not str(category).strip():
        return ""
    loc = normalize_locale(locale)
    key = _norm_key(category)
    mapped = CATEGORY_MAP.get(key)
    if mapped:
        return mapped[loc]
    return str(category).strip()


def localize_phrase(text: str, locale: str) -> str:
    if not text or not str(text).strip():
        return ""
    loc = normalize_locale(locale)
    if loc == "ru":
        return clean_raw_text(text)

    normalized = _norm_key(text)
    for phrase_key, translations in sorted(PHRASE_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if normalized == phrase_key or phrase_key in normalized:
            return translations[loc]

    result = clean_raw_text(text)
    for word in re.findall(r"[\w\u0400-\u04FF]+", result, flags=re.UNICODE):
        word_key = word.lower()
        if word_key in WORD_MAP:
            replacement = WORD_MAP[word_key][loc]
            result = re.sub(rf"\b{re.escape(word)}\b", replacement, result, flags=re.IGNORECASE)

    return re.sub(r"\s{2,}", " ", result).strip()


def build_listing_title(
    name_raw: str,
    brand: str | None,
    category: str | None,
    locale: str,
) -> str:
    loc = normalize_locale(locale)
    localized_name = localize_phrase(name_raw, loc)
    localized_category = localize_category(category, loc)
    brand_val = (brand or "").strip()

    parts: list[str] = []
    if brand_val and brand_val.lower() not in localized_name.lower():
        parts.append(brand_val)
    parts.append(localized_name or clean_raw_text(name_raw))

    title = " ".join(p for p in parts if p).strip()
    if localized_category and localized_category.lower() not in title.lower():
        title = f"{title} — {localized_category}"
    return title or clean_raw_text(name_raw)


def build_listing_description(
    title: str,
    description_raw: str | None,
    brand: str | None,
    locale: str,
) -> str:
    loc = normalize_locale(locale)
    copy = DESCRIPTION_COPY[loc]
    brand_val = (brand or "").strip()
    brand_line = copy["brand"].format(brand=brand_val) if brand_val else ""

    feature = localize_phrase(description_raw or "", loc)
    if feature:
        feature = feature.rstrip(".")
        body = f"{feature}. {copy['benefits']}"
    else:
        body = f"{copy['fallback']} {copy['benefits']}"

    return f"{title}. {brand_line} {body}".strip()


def build_listing_keywords(
    *,
    name_raw: str,
    brand: str | None,
    category: str | None,
    sku: str | None,
    locale: str,
) -> list[str]:
    loc = normalize_locale(locale)
    keywords: list[str] = []

    cat = localize_category(category, loc)
    if cat:
        keywords.append(cat)
    if brand and str(brand).strip():
        keywords.append(str(brand).strip())
    if sku and str(sku).strip():
        keywords.append(str(sku).strip())

    localized_name = localize_phrase(name_raw, loc)
    seen = {k.lower() for k in keywords}
    for word in localized_name.split():
        token = word.strip(".,-—|")
        if len(token) >= 3 and token.lower() not in seen:
            keywords.append(token)
            seen.add(token.lower())
        if len(keywords) >= 8:
            break
    return keywords[:8]
