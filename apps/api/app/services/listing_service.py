"""Product listing card generation and scoring (rule-based + AI provider reuse)."""

from __future__ import annotations

from datetime import datetime

from app.config import get_settings
from app.services.ai_service import get_ai_provider
from app.services.decision_service import product_snapshot
from app.services.pricing import calc_margin_percent

VALID_LISTING_STATUSES = {"draft", "ready", "needs_review"}


def _display_name(product) -> str:
    return (product.name_ai or product.name_raw or "").strip()


def _build_bullets(product, snap: dict) -> list[str]:
    bullets: list[str] = []
    name = _display_name(product)
    if product.brand:
        bullets.append(f"Бренд {product.brand} — проверенное качество")
    if product.category:
        bullets.append(f"Категория: {product.category} — подходит для быстрых продаж")
    if snap["margin_percent"] >= 20:
        bullets.append(f"Выгодная маржа {snap['margin_percent']:.0f}% — хороший потенциал прибыли")
    elif snap["gross_profit"] > 0:
        bullets.append(f"Положительная прибыль с каждой продажи")
    if product.stock_quantity and product.stock_quantity > 0:
        bullets.append(f"В наличии: {product.stock_quantity} шт.")
    if product.selling_price and product.selling_price > 0:
        bullets.append(f"Цена {product.selling_price:.0f} {product.currency or 'KZT'} — готово к публикации")
    if not bullets:
        bullets.append(f"{name} — товар для тестовых продаж без склада")
    return bullets[:5]


def _build_keywords(product) -> list[str]:
    keywords: list[str] = []
    for val in (product.category, product.brand, product.sku):
        if val and str(val).strip():
            keywords.append(str(val).strip())
    name = _display_name(product)
    for word in name.split():
        w = word.strip(".,-—|")
        if len(w) >= 3 and w.lower() not in {k.lower() for k in keywords}:
            keywords.append(w)
        if len(keywords) >= 8:
            break
    return keywords[:8]


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


def generate_product_listing(product) -> dict:
    """Generate listing fields; reuses AI provider when configured, else rule-based mock."""
    snap = product_snapshot(product)
    settings = get_settings()
    provider = get_ai_provider()
    use_ai_label = settings.AI_PROVIDER == "openai" and bool(settings.OPENAI_API_KEY)

    base_name = product.name_raw or ""
    try:
        title = provider.improve_title(base_name, product.brand, product.category)
    except NotImplementedError:
        title = provider.improve_title(base_name, product.brand, product.category)

    desc_source = product.description_ai or product.description_raw
    try:
        description = provider.improve_description(title, desc_source, product.brand)
    except NotImplementedError:
        description = provider.improve_description(title, desc_source, product.brand)

    bullets = _build_bullets(product, snap)
    keywords = _build_keywords(product)

    product.listing_title = title
    product.listing_description = description
    product.listing_bullets = bullets
    product.listing_keywords = keywords

    if not product.name_ai:
        product.name_ai = title
    if not product.description_ai:
        product.description_ai = description

    score = calc_listing_score(product, bullets, keywords)
    product.listing_score = score
    product.listing_status = resolve_listing_status(score, snap)
    product.last_listing_generated_at = datetime.utcnow()

    notes = "Rule-based listing" if not use_ai_label else "AI-assisted listing"
    if snap["decision_status"] != "good":
        notes += f"; decision={snap['decision_status']}"
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
