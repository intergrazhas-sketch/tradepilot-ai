"""Product decision scoring — good / risk / bad for MVP analytics."""
from __future__ import annotations

from app.services.pricing import (
    calc_gross_profit,
    calc_margin_percent,
    calc_markup_percent,
)

LOW_MARKUP_THRESHOLD = 20.0


def evaluate_product_decision(
    cost_price: float,
    selling_price: float,
    stock_quantity: int = 0,
    markup_percent: float | None = None,
) -> tuple[str, float, str]:
    """Returns (decision_status, decision_score, decision_reason_code)."""
    cost = cost_price or 0
    sell = selling_price or 0
    stock = stock_quantity or 0
    gross = calc_gross_profit(cost, sell)
    margin = calc_margin_percent(cost, sell)
    markup = markup_percent if markup_percent is not None else calc_markup_percent(cost, sell)

    if sell <= 0:
        return "bad", 5.0, "no_selling_price"
    if cost <= 0:
        return "bad", 10.0, "no_cost_price"
    if gross < 0:
        return "bad", 15.0, "negative_profit"
    if margin < 10:
        return "bad", 30.0, f"margin_below_10:{margin}"

    risk_parts: list[str] = []
    if margin < 20:
        risk_parts.append(f"margin_risk_zone:{margin}")
    if stock <= 0:
        risk_parts.append("no_stock")
    if markup < LOW_MARKUP_THRESHOLD:
        risk_parts.append(f"low_markup:{markup}")

    if gross > 0 and margin >= 20 and stock > 0 and not risk_parts:
        score = min(100.0, max(70.0, round(72 + margin * 0.6 + min(stock, 10), 1)))
        return "good", score, "profitable_for_test"

    reason = "|".join(risk_parts) if risk_parts else "needs_review"
    score = min(69.0, max(40.0, round(42 + margin + (8 if stock > 0 else 0), 1)))
    return "risk", score, reason


def product_snapshot(product) -> dict:
    """Build analytics dict from ORM product or dict-like row."""
    cost = getattr(product, "cost_price", 0) or 0
    sell = getattr(product, "selling_price", 0) or 0
    stock = getattr(product, "stock_quantity", 0) or 0
    markup = getattr(product, "markup_percent", None)
    gross = calc_gross_profit(cost, sell)
    margin = calc_margin_percent(cost, sell)
    markup_val = markup if markup is not None else calc_markup_percent(cost, sell)
    status, score, reason = evaluate_product_decision(cost, sell, stock, markup_val)
    name = getattr(product, "name_ai", None) or getattr(product, "name_raw", "")
    return {
        "id": getattr(product, "id", ""),
        "name": name,
        "sku": getattr(product, "sku", None),
        "cost_price": cost,
        "selling_price": sell,
        "gross_profit": gross,
        "margin_percent": margin,
        "markup_percent": markup_val,
        "stock_quantity": stock,
        "decision_status": status,
        "decision_score": score,
        "decision_reason": reason,
    }
