"""Internal launch checklist and daily control metrics."""

from __future__ import annotations

from app.services.decision_service import product_snapshot
from app.services.pricing import calc_margin_percent
from app.services.test_launch import is_test_launch_candidate

MIN_MARGIN = 20.0
ACTIVE_ORDER_STATUSES = {"new", "confirmed", "supplier_ordered"}
PROCESSED_ORDER_STATUSES = {"confirmed", "supplier_ordered", "delivered"}
SELECTED_LAUNCH_STATUSES = {"selected", "in_progress", "paused", "completed"}


def _checklist_status(count: int, *, done_min: int = 1, warning_if: bool = False) -> str:
    if count >= done_min:
        return "done"
    if warning_if and count == 0:
        return "warning"
    return "missing"


def build_launch_metrics(db) -> dict:
    from app import models

    products = db.query(models.Product).all()
    suppliers = db.query(models.Supplier).all()
    orders = db.query(models.Order).all()
    search_requests = db.query(models.SupplierSearchRequest).count()
    trend_leads = db.query(models.TrendProductLead).count()
    supplier_leads = db.query(models.SupplierLead).all()

    snapshots = [product_snapshot(p) for p in products]
    good_count = sum(1 for s in snapshots if s["decision_status"] == "good")
    ready_listings = sum(1 for p in products if (p.listing_status or "draft") == "ready")
    test_candidates = sum(1 for p in products if is_test_launch_candidate(p))
    selected_for_test = sum(
        1 for p in products if (p.test_launch_status or "not_selected") in SELECTED_LAUNCH_STATUSES
    )

    active_orders = sum(1 for o in orders if (o.status or "new") in ACTIVE_ORDER_STATUSES)
    processed_orders = sum(1 for o in orders if (o.status or "") in PROCESSED_ORDER_STATUSES)
    new_orders = sum(1 for o in orders if (o.status or "new") == "new")

    profits: list[float] = []
    margins: list[float] = []
    for p in products:
        st = p.test_launch_status or "not_selected"
        if st in ("selected", "in_progress", "completed"):
            snap = product_snapshot(p)
            profits.append(snap["gross_profit"])
            margins.append(snap["margin_percent"])

    avg_margin = round(sum(margins) / len(margins), 1) if margins else 0.0

    products_count = len(products)
    suppliers_count = len(suppliers)

    checklist_defs = [
        {
            "key": "has_suppliers",
            "title": "launchControl.checklist.hasSuppliers",
            "count": suppliers_count,
            "status": _checklist_status(suppliers_count),
            "action_label": "launchControl.action.suppliers",
            "action_href": "/suppliers",
        },
        {
            "key": "has_imported_products",
            "title": "launchControl.checklist.hasImportedProducts",
            "count": products_count,
            "status": _checklist_status(products_count),
            "action_label": "launchControl.action.import",
            "action_href": "/import",
        },
        {
            "key": "has_good_products",
            "title": "launchControl.checklist.hasGoodProducts",
            "count": good_count,
            "status": (
                "done" if good_count >= 1
                else ("warning" if products_count > 0 else "missing")
            ),
            "action_label": "launchControl.action.bestProducts",
            "action_href": "/best-products",
        },
        {
            "key": "has_ready_listings",
            "title": "launchControl.checklist.hasReadyListings",
            "count": ready_listings,
            "status": (
                "done" if ready_listings >= 1
                else ("warning" if good_count > 0 else "missing")
            ),
            "action_label": "launchControl.action.listingReady",
            "action_href": "/listing-ready",
        },
        {
            "key": "has_test_candidates",
            "title": "launchControl.checklist.hasTestCandidates",
            "count": test_candidates,
            "status": (
                "done" if test_candidates >= 1
                else ("warning" if ready_listings > 0 else "missing")
            ),
            "action_label": "launchControl.action.testLaunch",
            "action_href": "/test-launch",
        },
        {
            "key": "has_orders_flow",
            "title": "launchControl.checklist.hasOrdersFlow",
            "count": len(orders),
            "status": (
                "missing" if len(orders) == 0
                else ("done" if processed_orders > 0 else "warning")
            ),
            "action_label": "launchControl.action.orders",
            "action_href": "/orders",
        },
        {
            "key": "has_supplier_search",
            "title": "launchControl.checklist.hasSupplierSearch",
            "count": search_requests,
            "status": _checklist_status(search_requests),
            "action_label": "launchControl.action.supplierSearch",
            "action_href": "/supplier-search",
        },
        {
            "key": "has_trend_products",
            "title": "launchControl.checklist.hasTrendProducts",
            "count": trend_leads,
            "status": _checklist_status(trend_leads),
            "action_label": "launchControl.action.trendProducts",
            "action_href": "/trend-products",
        },
    ]

    status_counts = {"done": 0, "warning": 0, "missing": 0}
    for item in checklist_defs:
        status_counts[item["status"]] += 1

    return {
        "suppliers_count": suppliers_count,
        "products_count": products_count,
        "good_products_count": good_count,
        "ready_listings_count": ready_listings,
        "test_candidates_count": test_candidates,
        "selected_for_test_count": selected_for_test,
        "active_orders_count": active_orders,
        "total_expected_profit": round(sum(profits), 2),
        "average_margin_percent": avg_margin,
        "checklist": checklist_defs,
        "checklist_done": status_counts["done"],
        "checklist_warning": status_counts["warning"],
        "checklist_missing": status_counts["missing"],
        "_products": products,
        "_suppliers": suppliers,
        "_orders": orders,
        "_supplier_leads": supplier_leads,
        "_new_orders": new_orders,
    }


def build_launch_issues(db) -> list[dict]:
    from app import models

    metrics = build_launch_metrics(db)
    products = metrics["_products"]
    suppliers = metrics["_suppliers"]
    orders = metrics["_orders"]
    supplier_leads = metrics["_supplier_leads"]

    no_listing = sum(
        1 for p in products
        if not (p.listing_title or "").strip() or (p.listing_status or "draft") == "draft"
    )
    good_not_in_test = sum(
        1 for p in products
        if product_snapshot(p)["decision_status"] == "good"
        and is_test_launch_candidate(p)
        and (p.test_launch_status or "not_selected") == "not_selected"
    )
    low_margin = sum(
        1 for p in products
        if p.selling_price and calc_margin_percent(p.cost_price, p.selling_price) < MIN_MARGIN
    )
    suppliers_no_contact = sum(
        1 for s in suppliers if not (s.phone or "").strip() and not (s.email or "").strip()
    )
    leads_not_reviewed = sum(
        1 for l in supplier_leads if (l.discovery_status or "new") == "new"
    )
    new_orders_unprocessed = sum(1 for o in orders if (o.status or "new") == "new")

    issue_defs = [
        {
            "key": "products_without_listings",
            "title": "launchControl.issue.productsWithoutListings",
            "count": no_listing,
            "action_label": "launchControl.action.listingReady",
            "action_href": "/listing-ready",
        },
        {
            "key": "good_products_not_in_test",
            "title": "launchControl.issue.goodProductsNotInTest",
            "count": good_not_in_test,
            "action_label": "launchControl.action.testLaunch",
            "action_href": "/test-launch",
        },
        {
            "key": "low_margin_products",
            "title": "launchControl.issue.lowMarginProducts",
            "count": low_margin,
            "action_label": "launchControl.action.bestProducts",
            "action_href": "/best-products",
        },
        {
            "key": "suppliers_without_contacts",
            "title": "launchControl.issue.suppliersWithoutContacts",
            "count": suppliers_no_contact,
            "action_label": "launchControl.action.suppliers",
            "action_href": "/suppliers",
        },
        {
            "key": "supplier_leads_not_reviewed",
            "title": "launchControl.issue.supplierLeadsNotReviewed",
            "count": leads_not_reviewed,
            "action_label": "launchControl.action.supplierDiscovery",
            "action_href": "/supplier-discovery",
        },
        {
            "key": "new_orders_unprocessed",
            "title": "launchControl.issue.newOrdersUnprocessed",
            "count": new_orders_unprocessed,
            "action_label": "launchControl.action.orders",
            "action_href": "/orders",
        },
    ]

    return [i for i in issue_defs if i["count"] > 0]
