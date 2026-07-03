from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.supplier_discovery import _apply_scoring, _to_lead_out, HIGH_FIT_THRESHOLD
from app.services.supplier_search import generate_search_queries, VALID_LANGUAGES
from app.services.web_search_provider import (
    get_search_provider_status,
    run_supplier_search,
    score_search_result,
    MAX_QUERIES_PER_RUN,
    DEFAULT_LIMIT,
)

router = APIRouter(prefix="/api/v1/supplier-search", tags=["supplier-search"])

VALID_STATUSES = {"draft", "ready", "reviewed"}


def _to_request_out(req: models.SupplierSearchRequest) -> schemas.SupplierSearchRequestOut:
    return schemas.SupplierSearchRequestOut.model_validate(req)


def _to_web_result_out(row: models.SupplierSearchResult) -> schemas.SupplierSearchWebResultOut:
    return schemas.SupplierSearchWebResultOut.model_validate(row)


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


@router.get("/provider/status", response_model=schemas.SupplierSearchProviderStatus)
def provider_status():
    return schemas.SupplierSearchProviderStatus(**get_search_provider_status())


@router.get("/requests/{request_id}/results", response_model=list[schemas.SupplierSearchWebResultOut])
def list_web_results(request_id: str, db: Session = Depends(get_db)):
    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(404, detail={"message": "Search request not found"})
    rows = (
        db.query(models.SupplierSearchResult)
        .filter(models.SupplierSearchResult.search_request_id == request_id)
        .order_by(models.SupplierSearchResult.result_score.desc(), models.SupplierSearchResult.rank.asc())
        .all()
    )
    return [_to_web_result_out(r) for r in rows]


@router.post("/requests/{request_id}/run-live-search", response_model=schemas.SupplierSearchLiveRunResponse)
def run_live_search(request_id: str, db: Session = Depends(get_db)):
    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(404, detail={"message": "Search request not found"})

    status = get_search_provider_status()
    if not status["configured"]:
        return schemas.SupplierSearchLiveRunResponse(
            configured=False,
            provider=status["provider"],
            message=status["message"],
            queries_run=0,
            results=[],
        )

    queries = list(req.generated_queries or [])
    if not queries:
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

    saved: list[models.SupplierSearchResult] = []
    queries_run = 0
    last_message = status["message"]

    for query in queries[:MAX_QUERIES_PER_RUN]:
        search_out = run_supplier_search(
            query,
            country=req.country,
            language=req.language,
            limit=DEFAULT_LIMIT,
        )
        queries_run += 1
        last_message = search_out["message"]
        if not search_out.get("results"):
            continue

        for hit in search_out["results"]:
            score, name, price_flag, wholesale_flag, contacts_flag = score_search_result(
                hit["title"], hit["url"], hit.get("snippet") or ""
            )
            if score < (req.min_score or 0):
                continue
            existing = db.query(models.SupplierSearchResult).filter(
                models.SupplierSearchResult.search_request_id == request_id,
                models.SupplierSearchResult.url == hit["url"],
            ).first()
            if existing:
                continue

            row = models.SupplierSearchResult(
                search_request_id=request_id,
                title=hit["title"],
                url=hit["url"],
                snippet=hit.get("snippet"),
                source=hit.get("source") or status["provider"],
                query=hit.get("query") or query,
                rank=int(hit.get("rank") or 1),
                extracted_name=name,
                possible_price_list=price_flag,
                possible_wholesale=wholesale_flag,
                possible_contacts=contacts_flag,
                result_score=score,
            )
            db.add(row)
            saved.append(row)

    db.commit()
    for row in saved:
        db.refresh(row)

    all_results = (
        db.query(models.SupplierSearchResult)
        .filter(models.SupplierSearchResult.search_request_id == request_id)
        .order_by(models.SupplierSearchResult.result_score.desc(), models.SupplierSearchResult.rank.asc())
        .all()
    )

    return schemas.SupplierSearchLiveRunResponse(
        configured=True,
        provider=status["provider"],
        message=last_message if saved else last_message,
        queries_run=queries_run,
        results=[_to_web_result_out(r) for r in all_results],
    )


@router.post(
    "/results/{result_id}/convert-to-lead",
    response_model=schemas.SupplierSearchConvertResultResponse,
    status_code=201,
)
def convert_result_to_lead(result_id: str, db: Session = Depends(get_db)):
    row = db.query(models.SupplierSearchResult).filter(
        models.SupplierSearchResult.id == result_id
    ).first()
    if not row:
        raise HTTPException(404, detail={"message": "Search result not found"})

    if row.converted_lead_id:
        lead = db.query(models.SupplierLead).filter(models.SupplierLead.id == row.converted_lead_id).first()
        if lead:
            return schemas.SupplierSearchConvertResultResponse(
                result=_to_web_result_out(row),
                lead=_to_lead_out(lead),
            )

    req = db.query(models.SupplierSearchRequest).filter(
        models.SupplierSearchRequest.id == row.search_request_id
    ).first()

    notes_parts = [f"Live search: {row.query}", f"Rank: {row.rank}"]
    if row.snippet:
        notes_parts.append(row.snippet[:500])

    price_url = row.url if row.possible_price_list and (
        ".xlsx" in row.url.lower() or ".xls" in row.url.lower() or "price" in row.url.lower() or "прайс" in row.url.lower()
    ) else None

    lead = models.SupplierLead(
        name=row.extracted_name or row.title[:120],
        website_url=row.url,
        country=req.country if req else None,
        city=req.city if req else None,
        category=req.category if req else None,
        price_list_url=price_url,
        has_open_price_list=bool(row.possible_price_list),
        has_wholesale_terms=bool(row.possible_wholesale),
        source="supplier_search",
        search_request_id=row.search_request_id,
        notes="\n".join(notes_parts),
    )
    _apply_scoring(lead)
    db.add(lead)
    db.flush()

    row.converted_lead_id = lead.id
    db.commit()
    db.refresh(row)
    db.refresh(lead)

    return schemas.SupplierSearchConvertResultResponse(
        result=_to_web_result_out(row),
        lead=_to_lead_out(lead),
    )
