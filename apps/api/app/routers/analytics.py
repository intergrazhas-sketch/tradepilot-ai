from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.dashboard import _build_recommendations
from app.services.pricing import calc_margin_percent

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


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
