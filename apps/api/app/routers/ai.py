from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.config import get_settings
from app.services.ai_service import get_ai_provider
from app.services.pricing import calc_margin_percent

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
settings = get_settings()


def _get_product(db: Session, product_id: str) -> models.Product:
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")
    return product


def _log_job(db: Session, job_type: str, input_data: dict, output_data: dict):
    job = models.AIJob(type=job_type, status="completed", input_json=input_data, output_json=output_data)
    db.add(job)
    db.commit()


def _locale(request: Request) -> str:
    value = (request.headers.get("X-Locale") or "ru").lower()
    return value if value in {"ru", "en", "kz"} else "ru"


@router.post("/products/improve-title", response_model=schemas.AITitleResult)
def improve_title(payload: schemas.AIProductRequest, request: Request, db: Session = Depends(get_db)):
    product = _get_product(db, payload.product_id)
    ai = get_ai_provider()
    locale = _locale(request)
    new_title = ai.improve_title(product.name_raw, product.brand, product.category, locale=locale)

    product.name_ai = new_title
    db.commit()

    _log_job(db, "improve_title", {"product_id": product.id}, {"after": new_title})
    return schemas.AITitleResult(before=product.name_raw, after=new_title)


@router.post("/products/improve-description", response_model=schemas.AIDescriptionResult)
def improve_description(payload: schemas.AIProductRequest, request: Request, db: Session = Depends(get_db)):
    product = _get_product(db, payload.product_id)
    ai = get_ai_provider()
    locale = _locale(request)
    new_description = ai.improve_description(
        product.name_ai or product.name_raw, product.description_raw, product.brand, locale=locale
    )

    product.description_ai = new_description
    db.commit()

    _log_job(db, "improve_description", {"product_id": product.id}, {"after": new_description})
    return schemas.AIDescriptionResult(before=product.description_raw, after=new_description)


@router.post("/products/suggest-category", response_model=schemas.AICategoryResult)
def suggest_category(payload: schemas.AIProductRequest, request: Request, db: Session = Depends(get_db)):
    product = _get_product(db, payload.product_id)
    ai = get_ai_provider()
    locale = _locale(request)
    category, confidence = ai.suggest_category(
        product.name_ai or product.name_raw, product.description_ai or product.description_raw, locale=locale
    )

    product.category = category
    db.commit()

    _log_job(db, "suggest_category", {"product_id": product.id}, {"category": category, "confidence": confidence})
    return schemas.AICategoryResult(suggested_category=category, confidence=confidence)


@router.post("/products/suggest-price", response_model=schemas.AIPriceResult)
def suggest_price(payload: schemas.AIProductRequest, request: Request, db: Session = Depends(get_db)):
    product = _get_product(db, payload.product_id)
    ai = get_ai_provider()
    locale = _locale(request)
    price, markup, margin, explanation = ai.suggest_price(
        product.cost_price, settings.DEFAULT_MARKUP_PERCENT, settings.DEFAULT_MIN_MARGIN_PERCENT, locale=locale
    )

    product.selling_price = price
    product.markup_percent = markup
    db.commit()

    _log_job(db, "suggest_price", {"product_id": product.id}, {"price": price})
    return schemas.AIPriceResult(
        cost_price=product.cost_price,
        recommended_price=price,
        markup_percent=markup,
        margin_percent=margin,
        explanation=explanation,
    )


@router.post("/products/full-optimize", response_model=schemas.AIFullOptimizeResult)
def full_optimize(payload: schemas.AIProductRequest, request: Request, db: Session = Depends(get_db)):
    product = _get_product(db, payload.product_id)
    ai = get_ai_provider()
    locale = _locale(request)

    title_before = product.name_raw
    new_title = ai.improve_title(product.name_raw, product.brand, product.category, locale=locale)
    product.name_ai = new_title

    new_description = ai.improve_description(new_title, product.description_raw, product.brand, locale=locale)
    product.description_ai = new_description

    category, confidence = ai.suggest_category(new_title, new_description, locale=locale)
    product.category = category

    price, markup, margin, explanation = ai.suggest_price(
        product.cost_price, settings.DEFAULT_MARKUP_PERCENT, settings.DEFAULT_MIN_MARGIN_PERCENT, locale=locale
    )
    product.selling_price = price
    product.markup_percent = markup
    product.status = "active"

    db.commit()

    _log_job(db, "full_optimize", {"product_id": product.id}, {"title": new_title, "category": category, "price": price})

    return schemas.AIFullOptimizeResult(
        title=schemas.AITitleResult(before=title_before, after=new_title),
        description=schemas.AIDescriptionResult(before=product.description_raw, after=new_description),
        category=schemas.AICategoryResult(suggested_category=category, confidence=confidence),
        price=schemas.AIPriceResult(
            cost_price=product.cost_price,
            recommended_price=price,
            markup_percent=markup,
            margin_percent=margin,
            explanation=explanation,
        ),
    )
