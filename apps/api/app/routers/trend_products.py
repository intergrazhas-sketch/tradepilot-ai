from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/trend-products", tags=["trend-products"])


def _to_trend_out(item: models.TrendProductLead) -> schemas.TrendProductLeadOut:
    supplier_name = None
    if item.supplier_lead:
        supplier_name = item.supplier_lead.name
    return schemas.TrendProductLeadOut(
        id=item.id,
        title=item.title,
        category=item.category,
        source=item.source or "manual",
        trend_score=item.trend_score or 50,
        demand_reason=item.demand_reason,
        suggested_supplier_lead_id=item.suggested_supplier_lead_id,
        notes=item.notes,
        supplier_lead_name=supplier_name,
        created_at=item.created_at,
    )


@router.get("/leads", response_model=list[schemas.TrendProductLeadOut])
def list_trend_leads(db: Session = Depends(get_db)):
    items = (
        db.query(models.TrendProductLead)
        .options(joinedload(models.TrendProductLead.supplier_lead))
        .order_by(models.TrendProductLead.trend_score.desc(), models.TrendProductLead.created_at.desc())
        .all()
    )
    return [_to_trend_out(i) for i in items]


@router.post("/leads", response_model=schemas.TrendProductLeadOut, status_code=201)
def create_trend_lead(payload: schemas.TrendProductLeadCreate, db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(400, detail={"message": "Title is required"})

    if payload.suggested_supplier_lead_id:
        lead = db.query(models.SupplierLead).filter(
            models.SupplierLead.id == payload.suggested_supplier_lead_id
        ).first()
        if not lead:
            raise HTTPException(404, detail={"message": "Suggested supplier lead not found"})

    trend_score = max(0, min(100, payload.trend_score or 50))

    item = models.TrendProductLead(
        title=payload.title.strip(),
        category=payload.category,
        source=payload.source or "manual",
        trend_score=trend_score,
        demand_reason=payload.demand_reason,
        suggested_supplier_lead_id=payload.suggested_supplier_lead_id,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    item = (
        db.query(models.TrendProductLead)
        .options(joinedload(models.TrendProductLead.supplier_lead))
        .filter(models.TrendProductLead.id == item.id)
        .first()
    )
    return _to_trend_out(item)
