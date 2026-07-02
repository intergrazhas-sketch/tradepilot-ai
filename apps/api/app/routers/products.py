import csv
import io

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.config import get_settings
from app.services.pricing import price_from_markup

router = APIRouter(prefix="/api/v1/products", tags=["products"])
settings = get_settings()

REQUIRED_CSV_FIELDS = {"sku", "name", "description", "category", "brand", "cost_price", "stock_quantity", "currency", "image_url"}


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
    return query.order_by(models.Product.created_at.desc()).all()


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: str, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    db.delete(product)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# CSV import
# ---------------------------------------------------------------------------

def _parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


@router.post("/import-preview", response_model=schemas.ProductImportPreviewResponse)
async def import_preview(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        raw_rows = _parse_csv(content)
    except Exception as exc:
        raise HTTPException(400, f"Не удалось прочитать CSV: {exc}")

    if not raw_rows:
        raise HTTPException(400, "CSV файл пуст")

    rows: list[schemas.ProductImportPreviewRow] = []
    for raw in raw_rows:
        name = (raw.get("name") or "").strip()
        error = None
        valid = True

        if not name:
            valid = False
            error = "Поле 'name' обязательно"

        try:
            cost_price = float(raw.get("cost_price") or 0)
        except ValueError:
            cost_price = 0
            valid = False
            error = "Некорректная цена закупки"

        try:
            stock_quantity = int(float(raw.get("stock_quantity") or 0))
        except ValueError:
            stock_quantity = 0

        markup = settings.DEFAULT_MARKUP_PERCENT
        suggested_price = price_from_markup(cost_price, markup) if cost_price else 0

        rows.append(
            schemas.ProductImportPreviewRow(
                sku=raw.get("sku") or None,
                name=name or "(без названия)",
                description=raw.get("description") or None,
                category=raw.get("category") or None,
                brand=raw.get("brand") or None,
                cost_price=cost_price,
                stock_quantity=stock_quantity,
                currency=raw.get("currency") or settings.DEFAULT_CURRENCY,
                image_url=raw.get("image_url") or None,
                suggested_selling_price=suggested_price,
                valid=valid,
                error=error,
            )
        )

    valid_count = sum(1 for r in rows if r.valid)
    return schemas.ProductImportPreviewResponse(
        rows=rows,
        total_rows=len(rows),
        valid_rows=valid_count,
        invalid_rows=len(rows) - valid_count,
    )


@router.post("/import-csv", response_model=schemas.ProductImportCommitResponse)
def import_csv_commit(payload: schemas.ProductImportCommitRequest, db: Session = Depends(get_db)):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    created_ids = []
    for row in payload.rows:
        if not row.valid:
            continue
        product = models.Product(
            supplier_id=supplier.id,
            sku=row.sku,
            name_raw=row.name,
            description_raw=row.description,
            category=row.category,
            brand=row.brand,
            cost_price=row.cost_price,
            selling_price=row.suggested_selling_price,
            markup_percent=settings.DEFAULT_MARKUP_PERCENT,
            stock_quantity=row.stock_quantity,
            currency=row.currency,
            status="draft",
            image_url=row.image_url,
        )
        db.add(product)
        db.flush()
        created_ids.append(product.id)

    db.commit()
    return schemas.ProductImportCommitResponse(imported=len(created_ids), product_ids=created_ids)
