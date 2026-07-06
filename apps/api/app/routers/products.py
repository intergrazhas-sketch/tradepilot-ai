from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.import_service import build_preview_rows, commit_import, parse_upload
from app.services.decision_service import product_snapshot
from app.services.listing_service import (
    VALID_LISTING_STATUSES,
    calc_listing_score,
    generate_product_listing,
    listing_dict,
    resolve_listing_status,
)

router = APIRouter(prefix="/api/v1/products", tags=["products"])

VALID_TEST_STATUSES = {"none", "candidate", "testing", "rejected"}


def _to_product_out(product: models.Product) -> schemas.ProductOut:
    """Ensure computed profit fields are included in API JSON."""
    return schemas.ProductOut.model_validate(product)


def _to_listing_out(product: models.Product) -> schemas.ProductListingOut:
    data = listing_dict(product)
    return schemas.ProductListingOut(product_id=product.id, **data)


@router.get("/listing-summary", response_model=schemas.ListingSummary)
def listing_summary(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    ready = needs = draft = 0
    for p in products:
        st = p.listing_status or "draft"
        if st == "ready":
            ready += 1
        elif st == "needs_review":
            needs += 1
        else:
            draft += 1
    return schemas.ListingSummary(ready=ready, needs_review=needs, draft=draft)


@router.get("/listing-ready", response_model=list[schemas.ProductOut])
def list_listing_ready(db: Session = Depends(get_db)):
    products = db.query(models.Product).order_by(models.Product.listing_score.desc()).all()
    outs = []
    for p in products:
        st = p.listing_status or "draft"
        if st in ("ready", "needs_review") and (p.listing_title or "").strip():
            outs.append(_to_product_out(p))
    outs.sort(key=lambda x: (0 if x.listing_status == "ready" else 1, -x.listing_score))
    return outs


@router.get("/best", response_model=list[schemas.ProductOut])
def list_best_products(
    sort_by: str = "score",
    db: Session = Depends(get_db),
):
    products = db.query(models.Product).all()
    good = [p for p in products if product_snapshot(p)["decision_status"] == "good"]
    outs = [_to_product_out(p) for p in good]

    if sort_by == "profit":
        outs.sort(key=lambda x: x.gross_profit, reverse=True)
    elif sort_by == "margin":
        outs.sort(key=lambda x: x.margin_percent, reverse=True)
    else:
        outs.sort(key=lambda x: x.decision_score, reverse=True)
    return outs


@router.get("", response_model=list[schemas.ProductOut])
def list_products(
    supplier_id: str | None = None,
    category: str | None = None,
    search: str | None = None,
    decision_status: str | None = None,
    test_status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if supplier_id:
        query = query.filter(models.Product.supplier_id == supplier_id)
    if category:
        query = query.filter(models.Product.category == category)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (models.Product.name_raw.ilike(like)) |
            (models.Product.name_ai.ilike(like)) |
            (models.Product.sku.ilike(like))
        )
    products = query.order_by(models.Product.created_at.desc()).all()
    outs = [_to_product_out(p) for p in products]
    if decision_status:
        outs = [o for o in outs if o.decision_status == decision_status]
    if test_status:
        outs = [o for o in outs if o.test_status == test_status]
    return outs


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_product_out(product)


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return _to_product_out(product)


@router.get("/{product_id}/listing", response_model=schemas.ProductListingOut)
def get_product_listing(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return _to_listing_out(product)


@router.post("/{product_id}/generate-listing", response_model=schemas.ProductListingGenerateResponse)
def generate_listing(product_id: str, request: Request, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    locale = (request.headers.get("X-Locale") or "ru").lower()
    meta = generate_product_listing(product, locale=locale)
    db.commit()
    db.refresh(product)
    return schemas.ProductListingGenerateResponse(
        product=_to_product_out(product),
        generated_with=meta["generated_with"],
    )


@router.patch("/{product_id}/listing", response_model=schemas.ProductListingOut)
def update_product_listing(
    product_id: str,
    payload: schemas.ProductListingUpdate,
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    data = payload.model_dump(exclude_unset=True)
    if "listing_status" in data and data["listing_status"] not in VALID_LISTING_STATUSES:
        raise HTTPException(400, f"listing_status must be one of: {', '.join(sorted(VALID_LISTING_STATUSES))}")

    for field, value in data.items():
        setattr(product, field, value)

    snap = product_snapshot(product)
    product.listing_score = calc_listing_score(product, product.listing_bullets, product.listing_keywords)
    if "listing_status" not in data:
        product.listing_status = resolve_listing_status(product.listing_score, snap)

    db.commit()
    db.refresh(product)
    return _to_listing_out(product)


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: str, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return _to_product_out(product)


@router.patch("/{product_id}/test-status", response_model=schemas.ProductOut)
def update_test_status(
    product_id: str,
    payload: schemas.ProductTestStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.test_status not in VALID_TEST_STATUSES:
        raise HTTPException(400, f"test_status must be one of: {', '.join(sorted(VALID_TEST_STATUSES))}")
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    product.test_status = payload.test_status
    db.commit()
    db.refresh(product)
    return _to_product_out(product)


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Supplier price import (CSV / XLSX)
# ---------------------------------------------------------------------------

@router.post("/import-preview", response_model=schemas.ProductImportPreviewResponse)
async def import_preview(
    supplier_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    content = await file.read()
    try:
        raw_rows = parse_upload(file.filename or "", content)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(400, f"Не удалось прочитать файл: {exc}")

    if not raw_rows:
        raise HTTPException(400, "Файл не содержит строк для импорта")

    rows = build_preview_rows(raw_rows, supplier_id, db)
    valid_count = sum(1 for r in rows if r.valid)
    new_count = sum(1 for r in rows if r.row_status == "new")
    update_count = sum(1 for r in rows if r.row_status == "update")
    error_count = sum(1 for r in rows if r.row_status == "error")

    return schemas.ProductImportPreviewResponse(
        rows=rows,
        total_rows=len(rows),
        valid_rows=valid_count,
        invalid_rows=len(rows) - valid_count,
        new_rows=new_count,
        update_rows=update_count,
        error_rows=error_count,
    )


@router.post("/import-csv", response_model=schemas.ProductImportCommitResponse)
def import_csv_commit(payload: schemas.ProductImportCommitRequest, db: Session = Depends(get_db)):
    try:
        return commit_import(payload.supplier_id, payload.rows, db)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
