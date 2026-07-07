"""Product listing card generation and scoring (rule-based + AI provider reuse)."""

from __future__ import annotations

from datetime import datetime

from app.config import get_settings
from app.services.decision_service import product_snapshot
from app.services.listing_locale import (
    build_listing_description,
    build_listing_keywords,
    build_listing_title,
    localize_category,
    localize_phrase,
    normalize_locale,
)
from app.services.pricing import calc_margin_percent

VALID_LISTING_STATUSES = {"draft", "ready", "needs_review"}
SUPPORTED_LOCALES = {"ru", "en", "kz"}


def _normalize_locale(locale: str | None) -> str:
    return normalize_locale(locale)


def _build_bullets(product, snap: dict, locale: str) -> list[str]:
    loc = _normalize_locale(locale)
    bullets: list[str] = []
    name = localize_phrase(product.name_raw or "", loc)
    brand = product.brand
    category = localize_category(product.category, loc)
    margin = snap["margin_percent"]
    currency = product.currency or "KZT"

    if loc == "en":
        if brand:
            bullets.append(f"Brand {brand} — trusted quality")
        if category:
            bullets.append(f"Category: {category} — suitable for quick sales tests")
        if margin >= 20:
            bullets.append(f"Strong margin {margin:.0f}% — good profit potential")
        elif snap["gross_profit"] > 0:
            bullets.append("Positive profit on every sale")
        if product.stock_quantity and product.stock_quantity > 0:
            bullets.append(f"In stock: {product.stock_quantity} pcs")
        if product.selling_price and product.selling_price > 0:
            bullets.append(f"Price {product.selling_price:.0f} {currency} — ready to publish")
        if not bullets:
            bullets.append(f"{name} — product for test sales without warehouse")
        return bullets[:5]

    if loc == "kz":
        if brand:
            bullets.append(f"{brand} бренді — сенімді сапа")
        if category:
            bullets.append(f"Санат: {category} — жылдам сату тесті үшін")
        if margin >= 20:
            bullets.append(f"Тиімді маржа {margin:.0f}% — жақсы пайда әлеуеті")
        elif snap["gross_profit"] > 0:
            bullets.append("Әр сатудан оң пайда")
        if product.stock_quantity and product.stock_quantity > 0:
            bullets.append(f"Қоймада: {product.stock_quantity} дана")
        if product.selling_price and product.selling_price > 0:
            bullets.append(f"Баға {product.selling_price:.0f} {currency} — жариялауға дайын")
        if not bullets:
            bullets.append(f"{name} — қоймасыз сату тесті үшін тауар")
        return bullets[:5]

    if brand:
        bullets.append(f"Бренд {brand} — проверенное качество")
    if category:
        bullets.append(f"Категория: {category} — подходит для быстрых продаж")
    if margin >= 20:
        bullets.append(f"Выгодная маржа {margin:.0f}% — хороший потенциал прибыли")
    elif snap["gross_profit"] > 0:
        bullets.append("Положительная прибыль с каждой продажи")
    if product.stock_quantity and product.stock_quantity > 0:
        bullets.append(f"В наличии: {product.stock_quantity} шт.")
    if product.selling_price and product.selling_price > 0:
        bullets.append(f"Цена {product.selling_price:.0f} {currency} — готово к публикации")
    if not bullets:
        bullets.append(f"{name} — товар для тестовых продаж без склада")
    return bullets[:5]


def calc_listing_score(product, bullets: list[str] | None, keywords: list[str] | None) -> int:
    score = 0
    if (product.listing_title or "").strip():
        score += 20
    if (product.listing_description or "").strip():
        score += 20
    bl = bullets or product.listing_bullets or []
    if len(bl) >= 3:
        score += 20
    elif len(bl) >= 1:
        score += 10
    kw = keywords or product.listing_keywords or []
    if len(kw) >= 2:
        score += 10
    elif len(kw) >= 1:
        score += 5
    if (product.selling_price or 0) > 0:
        score += 10
    margin = calc_margin_percent(product.cost_price or 0, product.selling_price or 0)
    if margin >= 20:
        score += 10
    elif margin >= 10:
        score += 5
    if (product.stock_quantity or 0) > 0:
        score += 10
    return min(100, score)


def resolve_listing_status(score: int, snap: dict) -> str:
    if score >= 80 and snap["decision_status"] == "good" and snap.get("stock_quantity", 0) > 0:
        return "ready"
    if score >= 50:
        return "needs_review"
    return "draft"


def generate_product_listing(product, locale: str = "ru") -> dict:
    """Generate fully localized listing fields from raw product facts."""
    loc = _normalize_locale(locale)
    snap = product_snapshot(product)
    settings = get_settings()
    use_ai_label = settings.AI_PROVIDER == "openai" and bool(settings.OPENAI_API_KEY)

    title = build_listing_title(
        product.name_raw or "",
        product.brand,
        product.category,
        loc,
    )
    description = build_listing_description(
        title,
        product.description_raw,
        product.brand,
        loc,
    )
    bullets = _build_bullets(product, snap, loc)
    keywords = build_listing_keywords(
        name_raw=product.name_raw or "",
        brand=product.brand,
        category=product.category,
        sku=product.sku,
        locale=loc,
    )

    product.listing_title = title
    product.listing_description = description
    product.listing_bullets = bullets
    product.listing_keywords = keywords

    score = calc_listing_score(product, bullets, keywords)
    product.listing_score = score
    product.listing_status = resolve_listing_status(score, snap)
    product.last_listing_generated_at = datetime.utcnow()

    notes = "listing.notes.rules" if not use_ai_label else "listing.notes.ai"
    if snap["decision_status"] != "good":
        notes += f";decision={snap['decision_status']}"
    product.listing_notes = notes

    return {
        "listing_title": title,
        "listing_description": description,
        "listing_bullets": bullets,
        "listing_keywords": keywords,
        "listing_score": score,
        "listing_status": product.listing_status,
        "generated_with": "ai" if use_ai_label else "rules",
    }


def listing_dict(product) -> dict:
    return {
        "listing_title": product.listing_title,
        "listing_description": product.listing_description,
        "listing_bullets": product.listing_bullets or [],
        "listing_keywords": product.listing_keywords or [],
        "listing_status": product.listing_status or "draft",
        "listing_score": product.listing_score or 0,
        "listing_notes": product.listing_notes,
        "last_listing_generated_at": product.last_listing_generated_at,
    }
