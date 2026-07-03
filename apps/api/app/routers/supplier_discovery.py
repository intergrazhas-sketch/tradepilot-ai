from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.supplier_discovery import calc_supplier_fit_score

router = APIRouter(prefix="/api/v1/supplier-discovery", tags=["supplier-discovery"])

VALID_STATUSES = {"new", "reviewed", "added_to_suppliers", "rejected"}
HIGH_FIT_THRESHOLD = 70

FILTERS = {"all", "open_price", "wholesale", "high_score", "new", "rejected"}


def _apply_scoring(lead: models.SupplierLead) -> None:
    score, reason = calc_supplier_fit_score(
        has_open_price_list=bool(lead.has_open_price_list),
        has_wholesale_terms=bool(lead.has_wholesale_terms),
        contact_phone=lead.contact_phone,
        contact_email=lead.contact_email,
        whatsapp=lead.whatsapp,
        delivery_info=lead.delivery_info,
        category=lead.category,
        min_order_quantity=lead.min_order_quantity,
        price_list_url=lead.price_list_url,
    )
    lead.supplier_fit_score = score
    lead.supplier_fit_reason = reason


def _to_lead_out(lead: models.SupplierLead) -> schemas.SupplierLeadOut:
    return schemas.SupplierLeadOut.model_validate(lead)


def _filter_leads(leads: list[models.SupplierLead], filter_key: str | None) -> list[models.SupplierLead]:
    if not filter_key or filter_key == "all":
        return leads
    if filter_key == "open_price":
        return [l for l in leads if l.has_open_price_list or (l.price_list_url or "").strip()]
    if filter_key == "wholesale":
        return [l for l in leads if l.has_wholesale_terms]
    if filter_key == "high_score":
        return [l for l in leads if (l.supplier_fit_score or 0) >= HIGH_FIT_THRESHOLD]
    if filter_key == "new":
        return [l for l in leads if l.discovery_status == "new"]
    if filter_key == "rejected":
        return [l for l in leads if l.discovery_status == "rejected"]
    return leads


@router.get("/summary", response_model=schemas.SupplierDiscoverySummary)
def discovery_summary(db: Session = Depends(get_db)):
    leads = db.query(models.SupplierLead).all()
    trend_count = db.query(models.TrendProductLead).count()
    return schemas.SupplierDiscoverySummary(
        total_leads=len(leads),
        open_price_leads=sum(
            1 for l in leads if l.has_open_price_list or (l.price_list_url or "").strip()
        ),
        high_fit_leads=sum(1 for l in leads if (l.supplier_fit_score or 0) >= HIGH_FIT_THRESHOLD),
        new_leads=sum(1 for l in leads if l.discovery_status == "new"),
        trend_product_ideas=trend_count,
    )


@router.get("/leads", response_model=list[schemas.SupplierLeadOut])
def list_leads(filter: str | None = None, db: Session = Depends(get_db)):
    if filter and filter not in FILTERS:
        raise HTTPException(
            400,
            detail={"message": f"Invalid filter '{filter}'.", "allowed_filters": sorted(FILTERS)},
        )
    leads = db.query(models.SupplierLead).order_by(models.SupplierLead.created_at.desc()).all()
    leads = _filter_leads(leads, filter)
    return [_to_lead_out(l) for l in leads]


@router.post("/leads", response_model=schemas.SupplierLeadOut, status_code=201)
def create_lead(payload: schemas.SupplierLeadCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, detail={"message": "Name is required"})

    lead = models.SupplierLead(**payload.model_dump())
    if (lead.price_list_url or "").strip():
        lead.has_open_price_list = True
    _apply_scoring(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _to_lead_out(lead)


@router.patch("/leads/{lead_id}", response_model=schemas.SupplierLeadOut)
def update_lead(lead_id: str, payload: schemas.SupplierLeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(models.SupplierLead).filter(models.SupplierLead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, detail={"message": "Supplier lead not found"})

    data = payload.model_dump(exclude_unset=True)
    if "discovery_status" in data:
        if data["discovery_status"] not in VALID_STATUSES:
            raise HTTPException(
                400,
                detail={"message": f"Invalid status.", "allowed_statuses": sorted(VALID_STATUSES)},
            )

    for field, value in data.items():
        setattr(lead, field, value)

    if (lead.price_list_url or "").strip():
        lead.has_open_price_list = True

    rescore_fields = {
        "has_open_price_list", "has_wholesale_terms", "contact_phone", "contact_email",
        "whatsapp", "delivery_info", "category", "min_order_quantity", "price_list_url",
    }
    if rescore_fields.intersection(data.keys()) or not lead.supplier_fit_reason:
        _apply_scoring(lead)

    db.commit()
    db.refresh(lead)
    return _to_lead_out(lead)


@router.post("/leads/{lead_id}/convert-to-supplier", response_model=schemas.ConvertLeadResponse)
def convert_to_supplier(lead_id: str, db: Session = Depends(get_db)):
    lead = db.query(models.SupplierLead).filter(models.SupplierLead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, detail={"message": "Supplier lead not found"})

    if lead.converted_supplier_id:
        existing = db.query(models.Supplier).filter(models.Supplier.id == lead.converted_supplier_id).first()
        if existing:
            return schemas.ConvertLeadResponse(lead=_to_lead_out(lead), supplier=existing)

    notes_parts = []
    if lead.notes:
        notes_parts.append(lead.notes)
    if lead.website_url:
        notes_parts.append(f"Website: {lead.website_url}")
    if lead.price_list_url:
        notes_parts.append(f"Price list: {lead.price_list_url}")
    if lead.delivery_info:
        notes_parts.append(f"Delivery: {lead.delivery_info}")
    if lead.category:
        notes_parts.append(f"Category: {lead.category}")

    supplier = models.Supplier(
        name=lead.name,
        phone=lead.contact_phone or lead.whatsapp,
        email=lead.contact_email,
        country=lead.country,
        city=lead.city,
        notes="\n".join(notes_parts) if notes_parts else None,
        status="active",
    )
    db.add(supplier)
    db.flush()

    lead.discovery_status = "added_to_suppliers"
    lead.converted_supplier_id = supplier.id
    db.commit()
    db.refresh(lead)
    db.refresh(supplier)

    return schemas.ConvertLeadResponse(lead=_to_lead_out(lead), supplier=supplier)
