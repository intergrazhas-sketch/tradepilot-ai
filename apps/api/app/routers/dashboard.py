from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.pricing import calc_margin_percent
from app.services.decision_service import product_snapshot

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

LOW_STOCK_THRESHOLD = 5


def _build_recommendations(db: Session) -> list[str]:
    recs = []

    no_description = db.query(models.Product).filter(
        (models.Product.description_ai.is_(None)) & (models.Product.description_raw.is_(None))
    ).count()
    if no_description:
        recs.append(f"noDescription:{no_description}")

    no_category = db.query(models.Product).filter(models.Product.category.is_(None)).count()
    if no_category:
        recs.append(f"noCategory:{no_category}")

    low_stock = db.query(models.Product).filter(models.Product.stock_quantity <= LOW_STOCK_THRESHOLD).count()
    if low_stock:
        recs.append(f"lowStock:{low_stock}")

    low_margin = [
        p for p in db.query(models.Product).all()
        if p.selling_price and calc_margin_percent(p.cost_price, p.selling_price) < 15
    ]
    if low_margin:
        recs.append(f"lowMargin:{len(low_margin)}")

    if not recs:
        recs.append("allGood")

    return recs


@router.get("/workflow", response_model=schemas.WorkflowHints)
def workflow_hints(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    snapshots = [product_snapshot(p) for p in products]
    total = len(snapshots)
    good = sum(1 for s in snapshots if s["decision_status"] == "good")
    risk = sum(1 for s in snapshots if s["decision_status"] == "risk")
    bad = sum(1 for s in snapshots if s["decision_status"] == "bad")

    secondary: list[str] = []
    if total == 0:
        primary = "workflow.uploadPrice"
    elif bad >= 3 or (total > 0 and bad / total >= 0.3):
        primary = "workflow.checkPrices"
        if bad:
            secondary.append("workflow.checkImportErrors")
    elif good > 0:
        primary = "workflow.startBest"
    elif risk > 0:
        primary = "workflow.checkRisk"
        secondary.append("workflow.checkImportErrors")
    else:
        primary = "workflow.uploadPrice"

    if bad > 0 and "workflow.checkImportErrors" not in secondary:
        secondary.append("workflow.checkImportErrors")

    return schemas.WorkflowHints(
        primary_message=primary,
        secondary_messages=secondary,
        total_products=total,
        good_products=good,
        risk_products=risk,
        bad_products=bad,
        has_import_issues=bad > 0 or risk > 0,
    )


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    suppliers_count = db.query(models.Supplier).count()

    total_products = len(products)
    active_products = sum(1 for p in products if p.status == "active")
    low_stock_products = sum(1 for p in products if p.stock_quantity <= LOW_STOCK_THRESHOLD)

    revenue = sum(o.total_amount for o in orders if o.status != "cancelled")
    profit = sum(o.profit_amount for o in orders if o.status != "cancelled")

    margins = [
        calc_margin_percent(p.cost_price, p.selling_price)
        for p in products if p.selling_price
    ]
    average_margin = round(sum(margins) / len(margins), 1) if margins else 0.0

    return schemas.DashboardSummary(
        total_products=total_products,
        active_products=active_products,
        total_suppliers=suppliers_count,
        total_orders=len(orders),
        revenue=revenue,
        profit=profit,
        average_margin_percent=average_margin,
        low_stock_products=low_stock_products,
        recent_orders=orders[:5],
        ai_recommendations=_build_recommendations(db),
    )
