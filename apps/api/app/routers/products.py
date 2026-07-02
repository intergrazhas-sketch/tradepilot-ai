from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.services.import_service import build_preview_rows, commit_import, parse_upload

router = APIRouter(prefix="/api/v1/products", tags=["products"])


def _to_product_out(product: models.Product) -> schemas.ProductOut:
    """Ensure computed profit fields are included in API JSON."""
    return schemas.ProductOut.model_validate(product)


@router.get("", response_model=list[schemas.ProductOut])
def list_products(
    supplier_id: str | None = None,
    category: str | None = None,
    search: str | None = None,
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
    return [_to_product_out(p) for p in products]


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
