from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.supplier_discovery import _apply_scoring, _to_lead_out, HIGH_FIT_THRESHOLD
from app.services.supplier_search import generate_search_queries, VALID_LANGUAGES

router = APIRouter(prefix="/api/v1/supplier-search", tags=["supplier-search"])

VALID_STATUSES = {"draft", "ready", "reviewed"}


def _to_request_out(req: models.SupplierSearchRequest) -> schemas.SupplierSearchRequestOut:
    return schemas.SupplierSearchRequestOut.model_validate(req)


@router.get("/summary", response_model=schemas.SupplierSearchSummary)
def search_summary(db: Session = Depends(get_db)):
    requests = db.query(models.SupplierSearchRequest).all()
    search_leads = db.query(models.SupplierLead).filter(
        models.SupplierLead.source == "supplier_search"
    ).all()
    queries_count = sum(len(r.generated_queries or []) for r in requests)
    return schemas.SupplierSearchSummary(
        total_requests=len(requests),
        ready_requests=sum(1 for r in requests if r.status == "ready"),
        generated_queries_count=queries_count,
        leads_created_from_search=len(search_leads),
        high_fit_leads=sum(
            1 for l in search_leads if (l.supplier_fit_score or 0) >= HIGH_FIT_THRESHOLD
        ),
    )


@router.get("/requests", response_model=list[schemas.SupplierSearchRequestOut])
def list_requests(db: Session = Depends(get_db)):
    rows = (
        db.query(models.SupplierSearchRequest)
        .order_by(models.SupplierSearchRequest.created_at.desc())
        .all()
    )
    return [_to_request_out(r) for r in rows]


@router.post("/requests", response_model=schemas.SupplierSearchRequestOut, status_code=201)
def create_request(payload: schemas.SupplierSearchRequestCreate, db: Session = Depends(get_db)):
    if not payload.category.strip():
        raise HTTPException(400, detail={"message": "Category is required"})
    if payload.language not in VALID_LANGUAGES:
        raise HTTPException(
            400,
            detail={"message": f"Invalid language.", "allowed_languages": sorted(VALID_LANGUAGES)},
        )
    req = models.SupplierSearchRequest(**payload.model_dump())
    db.add(req)
    db.commit()
    db.refresh(req)
    return _to_request_out(req)


@router.get("/requests/{request_id}", response_model=schemas.SupplierSearchRequestOut)
def get_request(request_id: str, db: Session = Depends(get_db)):
    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(404, detail={"message": "Search request not found"})
    return _to_request_out(req)


@router.post("/requests/{request_id}/generate-queries", response_model=schemas.SupplierSearchRequestOut)
def generate_queries(request_id: str, db: Session = Depends(get_db)):
    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(404, detail={"message": "Search request not found"})

    queries = generate_search_queries(
        category=req.category,
        country=req.country,
        city=req.city,
        language=req.language or "ru",
        required_open_price_list=bool(req.required_open_price_list),
        required_wholesale=bool(req.required_wholesale),
        search_goal=req.search_goal,
    )
    req.generated_queries = queries
    req.status = "ready"
    db.commit()
    db.refresh(req)
    return _to_request_out(req)


@router.post(
    "/requests/{request_id}/add-result-as-lead",
    response_model=schemas.SupplierSearchAddResultResponse,
    status_code=201,
)
def add_result_as_lead(
    request_id: str,
    payload: schemas.SupplierSearchResultCreate,
    db: Session = Depends(get_db),
):
    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(404, detail={"message": "Search request not found"})
    if not payload.name.strip():
        raise HTTPException(400, detail={"message": "Name is required"})

    notes_parts: list[str] = []
    if payload.source_url:
        notes_parts.append(f"Source URL: {payload.source_url.strip()}")
    if payload.notes:
        notes_parts.append(payload.notes.strip())

    lead = models.SupplierLead(
        name=payload.name.strip(),
        website_url=payload.website_url,
        country=payload.country or req.country,
        city=payload.city or req.city,
        category=payload.category or req.category,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        whatsapp=payload.whatsapp,
        price_list_url=payload.price_list_url,
        has_wholesale_terms=payload.has_wholesale_terms,
        min_order_quantity=payload.min_order_quantity,
        delivery_info=payload.delivery_info,
        source="supplier_search",
        search_request_id=req.id,
        notes="\n".join(notes_parts) if notes_parts else None,
    )
    if (lead.price_list_url or "").strip():
        lead.has_open_price_list = True
    _apply_scoring(lead)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.refresh(req)
    return schemas.SupplierSearchAddResultResponse(
        lead=_to_lead_out(lead),
        request=_to_request_out(req),
    )
