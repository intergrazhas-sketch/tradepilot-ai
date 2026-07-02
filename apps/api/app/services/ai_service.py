"""
AI Service Abstraction.

This module is the single integration point for AI features. The MVP ships
with a deterministic mock implementation so the product works with zero
external dependencies and zero API keys.

To connect a real LLM later:
  1. Set AI_PROVIDER=openai and OPENAI_API_KEY in .env
  2. Implement OpenAIProvider.* methods below using the OpenAI SDK
     (or any other LLM provider - the interface stays the same)
  3. No router or frontend code needs to change.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod

from app.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# Provider interface
# ---------------------------------------------------------------------------

class AIProvider(ABC):
    @abstractmethod
    def improve_title(self, name_raw: str, brand: str | None, category: str | None) -> str: ...

    @abstractmethod
    def improve_description(self, name: str, description_raw: str | None, brand: str | None) -> str: ...

    @abstractmethod
    def suggest_category(self, name: str, description: str | None) -> tuple[str, float]: ...

    @abstractmethod
    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float
    ) -> tuple[float, float, float, str]:
        """Returns (recommended_price, markup_percent, margin_percent, explanation)."""
        ...


# ---------------------------------------------------------------------------
# Mock provider - deterministic, realistic-looking, no external calls
# ---------------------------------------------------------------------------

NOISE_PATTERNS = [
    r"\b(NEW|HOT|SALE|АКЦИЯ|ХИТ|ТОП)\b",
    r"!{2,}",
    r"\*+",
    r"\s{2,}",
    r"#\w+",
]

CATEGORY_KEYWORDS = {
    "Электроника": ["phone", "телефон", "наушники", "headphone", "laptop", "ноутбук", "зарядка", "charger", "tv", "телевизор", "камера", "camera"],
    "Дом и быт": ["кастрюля", "посуда", "чашка", "лампа", "lamp", "полотенце", "towel", "подушка", "pillow", "ковер"],
    "Одежда": ["футболка", "shirt", "платье", "dress", "куртка", "jacket", "джинсы", "jeans", "обувь", "shoes"],
    "Аксессуары": ["сумка", "bag", "часы", "watch", "очки", "glasses", "ремень", "belt", "кошелек"],
    "Красота и здоровье": ["крем", "cream", "шампунь", "shampoo", "косметика", "парфюм", "perfume"],
}


class MockAIProvider(AIProvider):
    def improve_title(self, name_raw: str, brand: str | None, category: str | None) -> str:
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

    def improve_description(self, name: str, description_raw: str | None, brand: str | None) -> str:
        base = (description_raw or "").strip()
        base = re.sub(r"\s{2,}", " ", base)

        brand_line = f"Бренд: {brand}. " if brand else ""
        benefits = (
            "Проверенное качество, аккуратная упаковка и быстрая отправка. "
            "Подходит как для личного использования, так и в подарок."
        )

        if base:
            return f"{name}. {brand_line}{base.rstrip('.')}. {benefits}"
        return f"{name}. {brand_line}Надежный выбор по выгодной цене. {benefits}"

    def suggest_category(self, name: str, description: str | None) -> tuple[str, float]:
        text = f"{name} {description or ''}".lower()
        best_category = "Разное"
        best_score = 0
        for category, keywords in CATEGORY_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text)
            if score > best_score:
                best_score = score
                best_category = category

        confidence = 0.55 if best_score == 0 else min(0.6 + best_score * 0.15, 0.95)
        return best_category, round(confidence, 2)

    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float
    ) -> tuple[float, float, float, str]:
        if cost_price <= 0:
            return 0.0, default_markup, 0.0, "Укажите закупочную цену, чтобы рассчитать рекомендуемую цену продажи."

        markup = max(default_markup, min_margin + 5)
        price = round(cost_price * (1 + markup / 100), -1) or round(cost_price * (1 + markup / 100), 2)
        margin = round((price - cost_price) / price * 100, 1) if price else 0

        explanation = (
            f"Цена рассчитана от себестоимости {cost_price:.0f} с наценкой {markup:.0f}%, "
            f"что дает маржу {margin:.1f}% — выше минимального порога {min_margin:.0f}%."
        )
        return float(price), float(markup), float(margin), explanation


# ---------------------------------------------------------------------------
# OpenAI provider stub - implement when ready to go live
# ---------------------------------------------------------------------------

class OpenAIProvider(AIProvider):
    """Placeholder for a real LLM-backed provider.

    Implementing this only requires filling in the methods below using the
    OpenAI (or any other LLM) SDK; the rest of the application is unaware of
    which provider is active.
    """

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

    def improve_title(self, name_raw: str, brand: str | None, category: str | None) -> str:
        raise NotImplementedError("Wire up OpenAI/LLM API call here using self.api_key / self.model")

    def improve_description(self, name: str, description_raw: str | None, brand: str | None) -> str:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")

    def suggest_category(self, name: str, description: str | None) -> tuple[str, float]:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")

    def suggest_price(
        self, cost_price: float, default_markup: float, min_margin: float
    ) -> tuple[float, float, float, str]:
        raise NotImplementedError("Wire up OpenAI/LLM API call here")


def get_ai_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return OpenAIProvider(settings.OPENAI_API_KEY, settings.OPENAI_MODEL)
    # Falls back to mock if no provider configured - MVP always works out of the box.
    return MockAIProvider()
