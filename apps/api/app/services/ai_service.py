"""
AI Service Abstraction.

This module is the single integration point for AI features. The MVP ships
with a deterministic mock implementation so the product works with zero
external dependencies and zero API keys.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod

from app.config import get_settings

settings = get_settings()
SUPPORTED_LOCALES = {"ru", "en", "kz"}


def _normalize_locale(locale: str | None) -> str:
    value = (locale or "ru").lower().strip()
    return value if value in SUPPORTED_LOCALES else "ru"


class AIProvider(ABC):
    @abstractmethod
    def improve_title(
        self, name_raw: str, brand: str | None, category: str | None, *, locale: str = "ru"
    ) -> str: ...

    @abstractmethod
    def improve_description(
        self, name: str, description_raw: str | None, brand: str | None, *, locale: str = "ru"
    ) -> str: ...

    @abstractmethod
    def suggest_category(
        self, name: str, description: str | None, *, locale: str = "ru"
    ) -> tuple[str, float]: ...

    @abstractmethod
    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float, *, locale: str = "ru"
    ) -> tuple[float, float, float, str]: ...


NOISE_PATTERNS = [
    r"\b(NEW|HOT|SALE|АКЦИЯ|ХИТ|ТОП)\b",
    r"!{2,}",
    r"\*+",
    r"\s{2,}",
    r"#\w+",
]

CATEGORY_KEYWORDS = {
    "electronics": ["phone", "телефон", "наушники", "headphone", "laptop", "ноутбук", "зарядка", "charger", "tv", "телевизор", "камера", "camera"],
    "home": ["кастрюля", "посуда", "чашка", "лампа", "lamp", "полотенце", "towel", "подушка", "pillow", "ковер"],
    "fashion": ["футболка", "shirt", "платье", "dress", "куртка", "jacket", "джинсы", "jeans", "обувь", "shoes"],
    "accessories": ["сумка", "bag", "часы", "watch", "очки", "glasses", "ремень", "belt", "кошелек"],
    "beauty": ["крем", "cream", "шампунь", "shampoo", "косметика", "парфюм", "perfume"],
}

CATEGORY_LABELS = {
    "ru": {
        "electronics": "Электроника",
        "home": "Дом и быт",
        "fashion": "Одежда",
        "accessories": "Аксессуары",
        "beauty": "Красота и здоровье",
        "other": "Разное",
    },
    "en": {
        "electronics": "Electronics",
        "home": "Home & Kitchen",
        "fashion": "Fashion",
        "accessories": "Accessories",
        "beauty": "Beauty & Health",
        "other": "Other",
    },
    "kz": {
        "electronics": "Электроника",
        "home": "Үй және асхана",
        "fashion": "Киім",
        "accessories": "Аксессуарлар",
        "beauty": "Сұлулық және денсаулық",
        "other": "Әртүрлі",
    },
}

DESCRIPTION_COPY = {
    "ru": {
        "brand": "Бренд: {brand}. ",
        "benefits": "Проверенное качество, аккуратная упаковка и быстрая отправка. Подходит как для личного использования, так и в подарок.",
        "fallback": "Надежный выбор по выгодной цене.",
    },
    "en": {
        "brand": "Brand: {brand}. ",
        "benefits": "Trusted quality, neat packaging, and fast dispatch. Suitable for personal use or as a gift.",
        "fallback": "A reliable choice at a competitive price.",
    },
    "kz": {
        "brand": "Бренд: {brand}. ",
        "benefits": "Сенімді сапа, ұқыпты орау және жылдам жіберу. Жеке пайдалануға немесе сыйлыққа сай.",
        "fallback": "Тиімді бағада сенімді таңдау.",
    },
}

PRICE_COPY = {
    "ru": {
        "missing_cost": "Укажите закупочную цену, чтобы рассчитать рекомендуемую цену продажи.",
        "explanation": "Цена рассчитана от себестоимости {cost:.0f} с наценкой {markup:.0f}%, что дает маржу {margin:.1f}% — выше минимального порога {min_margin:.0f}%.",
    },
    "en": {
        "missing_cost": "Enter the purchase price to calculate a recommended selling price.",
        "explanation": "Price is based on cost {cost:.0f} with {markup:.0f}% markup, giving {margin:.1f}% margin — above the {min_margin:.0f}% minimum.",
    },
    "kz": {
        "missing_cost": "Сатушы бағасын енгізіңіз, сату бағасын есептеу үшін.",
        "explanation": "Баға {cost:.0f} өзіндік құннан {markup:.0f}% үстемемен есептелді, маржа {margin:.1f}% — {min_margin:.0f}% минимумнан жоғары.",
    },
}


class MockAIProvider(AIProvider):
    def improve_title(
        self, name_raw: str, brand: str | None, category: str | None, *, locale: str = "ru"
    ) -> str:
        cleaned = name_raw.strip()
        for pattern in NOISE_PATTERNS:
            cleaned = re.sub(pattern, " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" -_,.")
        cleaned = cleaned[:1].upper() + cleaned[1:] if cleaned else cleaned

        parts = []
        if brand and brand.lower() not in cleaned.lower():
            parts.append(brand)
        parts.append(cleaned)
        if category and category.lower() not in cleaned.lower():
            parts.append(f"— {category}")

        result = " ".join(parts).strip()
        return result or name_raw

    def improve_description(
        self, name: str, description_raw: str | None, brand: str | None, *, locale: str = "ru"
    ) -> str:
        loc = _normalize_locale(locale)
        copy = DESCRIPTION_COPY[loc]
        base = (description_raw or "").strip()
        base = re.sub(r"\s{2,}", " ", base)

        brand_line = copy["brand"].format(brand=brand) if brand else ""
        benefits = copy["benefits"]

        if base:
            return f"{name}. {brand_line}{base.rstrip('.')}. {benefits}"
        return f"{name}. {brand_line}{copy['fallback']} {benefits}"

    def suggest_category(
        self, name: str, description: str | None, *, locale: str = "ru"
    ) -> tuple[str, float]:
        loc = _normalize_locale(locale)
        labels = CATEGORY_LABELS[loc]
        text = f"{name} {description or ''}".lower()
        best_slug = "other"
        best_score = 0
        for slug, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > best_score:
                best_score = score
                best_slug = slug

        confidence = 0.55 if best_score == 0 else min(0.6 + best_score * 0.15, 0.95)
        return labels[best_slug], round(confidence, 2)

    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float, *, locale: str = "ru"
    ) -> tuple[float, float, float, str]:
        loc = _normalize_locale(locale)
        copy = PRICE_COPY[loc]
        if cost_price <= 0:
            return 0.0, default_markup, 0.0, copy["missing_cost"]

        markup = max(default_markup, min_margin + 5)
        price = round(cost_price * (1 + markup / 100), -1) or round(cost_price * (1 + markup / 100), 2)
        margin = round((price - cost_price) / price * 100, 1) if price else 0

        explanation = copy["explanation"].format(
            cost=cost_price,
            markup=markup,
            margin=margin,
            min_margin=min_margin,
        )
        return float(price), float(markup), float(margin), explanation


class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def improve_title(
        self, name_raw: str, brand: str | None, category: str | None, *, locale: str = "ru"
    ) -> str:
        raise NotImplementedError("Wire up OpenAI/LLM API call here using self.api_key / self.model")

    def improve_description(
        self, name: str, description_raw: str | None, brand: str | None, *, locale: str = "ru"
    ) -> str:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")

    def suggest_category(
        self, name: str, description: str | None, *, locale: str = "ru"
    ) -> tuple[str, float]:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")

    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float, *, locale: str = "ru"
    ) -> tuple[float, float, float, str]:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")


def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
    return MockAIProvider()
