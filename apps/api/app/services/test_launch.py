"""Test launch pack — candidate selection and export."""

from __future__ import annotations

from app.services.decision_service import product_snapshot
from app.services.pricing import calc_gross_profit, calc_margin_percent

VALID_LAUNCH_STATUSES = {"not_selected", "selected", "in_progress", "paused", "completed"}
MIN_MARGIN = 20.0
MIN_LISTING_SCORE = 70


def is_test_launch_candidate(product) -> bool:
    snap = product_snapshot(product)
    if snap["decision_status"] != "good":
        return False
    if snap["stock_quantity"] <= 0:
        return False
    if snap["margin_percent"] < MIN_MARGIN:
        return False
    listing_ready = (getattr(product, "listing_status", None) or "") == "ready"
    listing_score_ok = (getattr(product, "listing_score", 0) or 0) >= MIN_LISTING_SCORE
    if not listing_ready and not listing_score_ok:
        return False
    return True


def product_launch_row(product, supplier_name: str | None = None) -> dict:
    snap = product_snapshot(product)
    return {
        "product": product,
        "supplier_name": supplier_name,
        "gross_profit": snap["gross_profit"],
        "margin_percent": snap["margin_percent"],
        "decision_status": snap["decision_status"],
        "is_candidate": is_test_launch_candidate(product),
    }
