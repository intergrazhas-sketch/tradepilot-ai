from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.dashboard import _build_recommendations
from app.services.pricing import calc_margin_percent
from app.services.decision_service import product_snapshot

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _build_snapshots(products: list) -> list[dict]:
    return [product_snapshot(p) for p in products]


@router.get("/summary", response_model=schemas.AnalyticsSummary)
def analytics_summary(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    snapshots = _build_snapshots(products)

    good = sum(1 for s in snapshots if s["decision_status"] == "good")
    risk = sum(1 for s in snapshots if s["decision_status"] == "risk")
    bad = sum(1 for s in snapshots if s["decision_status"] == "bad")

    margins = [s["margin_percent"] for s in snapshots if s["selling_price"] > 0]
    markups = [s["markup_percent"] for s in snapshots if s["cost_price"] > 0]
    avg_margin = round(sum(margins) / len(margins), 1) if margins else 0.0
    avg_markup = round(sum(markups) / len(markups), 1) if markups else 0.0
    total_potential = round(sum(max(0, s["gross_profit"]) for s in snapshots), 2)

    by_profit = sorted(snapshots, key=lambda x: x["gross_profit"], reverse=True)[:5]
    by_margin = sorted(
        [s for s in snapshots if s["selling_price"] > 0],
        key=lambda x: x["margin_percent"],
        reverse=True,
    )[:5]
    low_margin = sorted(
        [s for s in snapshots if s["margin_percent"] < 20 and s["selling_price"] > 0],
        key=lambda x: x["margin_percent"],
    )[:5]
    out_of_stock = [s for s in snapshots if (s["stock_quantity"] or 0) <= 0][:10]

    return schemas.AnalyticsSummary(
        total_products=len(products),
        good_products=good,
        risk_products=risk,
        bad_products=bad,
        total_potential_profit=total_potential,
        average_margin_percent=avg_margin,
        average_markup_percent=avg_markup,
        top_products_by_profit=by_profit,
        top_products_by_margin=by_margin,
        low_margin_products=low_margin,
        out_of_stock_products=out_of_stock,
    )


@router.get("/suppliers", response_model=list[schemas.SupplierAnalyticsItem])
def supplier_analytics(db: Session = Depends(get_db)):
    suppliers = db.query(models.Supplier).all()
    products = db.query(models.Product).all()
    by_supplier: dict[str, list] = {}
    for p in products:
        sid = p.supplier_id or ""
        by_supplier.setdefault(sid, []).append(p)

    result: list[schemas.SupplierAnalyticsItem] = []
    for supplier in suppliers:
        items = by_supplier.get(supplier.id, [])
        snapshots = _build_snapshots(items)
        good = sum(1 for s in snapshots if s["decision_status"] == "good")
        risk = sum(1 for s in snapshots if s["decision_status"] == "risk")
        bad = sum(1 for s in snapshots if s["decision_status"] == "bad")
        margins = [s["margin_percent"] for s in snapshots if s["selling_price"] > 0]
        avg_margin = round(sum(margins) / len(margins), 1) if margins else 0.0
        total_profit = round(sum(max(0, s["gross_profit"]) for s in snapshots), 2)
        count = len(snapshots)
        if count:
            supplier_score = round(
                (good * 85 + risk * 55 + bad * 25) / count, 1
            )
        else:
            supplier_score = 0.0

        result.append(
            schemas.SupplierAnalyticsItem(
                supplier_id=supplier.id,
                supplier_name=supplier.name,
                products_count=count,
                good_count=good,
                risk_count=risk,
                bad_count=bad,
                average_margin_percent=avg_margin,
                total_potential_profit=total_profit,
                supplier_score=supplier_score,
            )
        )

    return sorted(result, key=lambda x: x.supplier_score, reverse=True)


@router.get("/profit", response_model=schemas.ProfitAnalytics)
def profit_analytics(db: Session = Depends(get_db)):
    orders = db.query(models.Order).filter(models.Order.status != "cancelled").all()
    products = db.query(models.Product).all()

    revenue = sum(o.total_amount for o in orders)
    cost = sum(o.cost_amount for o in orders)
    profit = revenue - cost

    margins = [calc_margin_percent(p.cost_price, p.selling_price) for p in products if p.selling_price]
    avg_margin = round(sum(margins) / len(margins), 1) if margins else 0.0

    scored = [
        {
            "id": p.id,
            "name": p.name_ai or p.name_raw,
            "margin_percent": calc_margin_percent(p.cost_price, p.selling_price),
            "selling_price": p.selling_price,
            "cost_price": p.cost_price,
        }
        for p in products if p.selling_price
    ]

    top_profit = sorted(scored, key=lambda x: x["margin_percent"], reverse=True)[:5]
    low_margin = sorted(scored, key=lambda x: x["margin_percent"])[:5]

    return schemas.ProfitAnalytics(
        revenue=revenue,
        cost=cost,
        profit=profit,
        average_margin_percent=avg_margin,
        top_profit_products=top_profit,
        low_margin_products=low_margin,
    )


@router.get("/products")
def product_analytics(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    by_category: dict[str, dict] = {}
    for p in products:
        cat = p.category or "Без категории"
        bucket = by_category.setdefault(cat, {"category": cat, "count": 0, "total_stock": 0})
        bucket["count"] += 1
        bucket["total_stock"] += p.stock_quantity or 0
    return {"categories": list(by_category.values())}


@router.get("/recommendations", response_model=schemas.RecommendationsResponse)
def recommendations(db: Session = Depends(get_db)):
    return schemas.RecommendationsResponse(recommendations=_build_recommendations(db))
