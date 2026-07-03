import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.routers.products import _to_product_out
from app.services.test_launch import VALID_LAUNCH_STATUSES, is_test_launch_candidate, product_launch_row

router = APIRouter(prefix="/api/v1/test-launch", tags=["test-launch"])


def _supplier_map(db: Session) -> dict[str, str]:
    return {s.id: s.name for s in db.query(models.Supplier).all()}


def _to_launch_out(product: models.Product, supplier_name: str | None) -> schemas.TestLaunchProductOut:
    base = _to_product_out(product).model_dump()
    return schemas.TestLaunchProductOut(**base, supplier_name=supplier_name)


@router.get("/candidates", response_model=list[schemas.TestLaunchProductOut])
def list_candidates(
    status: str | None = Query(None, description="Filter by test_launch_status"),
    db: Session = Depends(get_db),
):
    if status and status not in VALID_LAUNCH_STATUSES:
        raise HTTPException(
            400,
            detail={"message": "Invalid status", "allowed_statuses": sorted(VALID_LAUNCH_STATUSES)},
        )

    suppliers = _supplier_map(db)
    products = db.query(models.Product).order_by(models.Product.created_at.desc()).all()
    results: list[schemas.TestLaunchProductOut] = []

    for p in products:
        launch_status = p.test_launch_status or "not_selected"
        eligible = is_test_launch_candidate(p)
        in_pipeline = launch_status != "not_selected"

        if not eligible and not in_pipeline:
            continue
        if status and launch_status != status:
            continue

        results.append(_to_launch_out(p, suppliers.get(p.supplier_id or "")))

    results.sort(
        key=lambda x: (
            0 if x.test_launch_status in ("in_progress", "selected") else 1,
            -x.listing_score,
            -x.margin_percent,
        )
    )
    return results


@router.post("/products/{product_id}/select", response_model=schemas.TestLaunchProductOut)
def select_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, detail={"message": "Product not found"})
    if not is_test_launch_candidate(product):
        raise HTTPException(
            400,
            detail={"message": "Product does not meet test launch candidate criteria"},
        )
    product.test_launch_status = "selected"
    db.commit()
    db.refresh(product)
    suppliers = _supplier_map(db)
    return _to_launch_out(product, suppliers.get(product.supplier_id or ""))


@router.patch("/products/{product_id}/status", response_model=schemas.TestLaunchProductOut)
def update_launch_status(
    product_id: str,
    payload: schemas.TestLaunchStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.test_launch_status not in VALID_LAUNCH_STATUSES:
        raise HTTPException(
            400,
            detail={"message": "Invalid status", "allowed_statuses": sorted(VALID_LAUNCH_STATUSES)},
        )
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, detail={"message": "Product not found"})

    if payload.test_launch_status != "not_selected" and not is_test_launch_candidate(product):
        if (product.test_launch_status or "not_selected") == "not_selected":
            raise HTTPException(
                400,
                detail={"message": "Product does not meet test launch candidate criteria"},
            )

    product.test_launch_status = payload.test_launch_status
    db.commit()
    db.refresh(product)
    suppliers = _supplier_map(db)
    return _to_launch_out(product, suppliers.get(product.supplier_id or ""))


@router.get("/summary", response_model=schemas.TestLaunchSummary)
def test_launch_summary(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    suppliers = _supplier_map(db)

    total_candidates = 0
    selected = in_progress = completed = 0
    profits: list[float] = []
    margins: list[float] = []

    for p in products:
        if is_test_launch_candidate(p):
            total_candidates += 1
        st = p.test_launch_status or "not_selected"
        if st == "selected":
            selected += 1
        elif st == "in_progress":
            in_progress += 1
        elif st == "completed":
            completed += 1

        if st in ("selected", "in_progress", "completed"):
            row = product_launch_row(p, suppliers.get(p.supplier_id or ""))
            profits.append(row["gross_profit"])
            margins.append(row["margin_percent"])

    avg_margin = round(sum(margins) / len(margins), 1) if margins else 0.0
    return schemas.TestLaunchSummary(
        total_candidates=total_candidates,
        selected_count=selected,
        in_progress_count=in_progress,
        completed_count=completed,
        total_expected_profit=round(sum(profits), 2),
        average_margin_percent=avg_margin,
    )


@router.get("/export-csv")
def export_csv(db: Session = Depends(get_db)):
    suppliers = _supplier_map(db)
    products = db.query(models.Product).all()
    rows = [
        p for p in products
        if (p.test_launch_status or "not_selected") in ("selected", "in_progress", "paused", "completed")
    ]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "sku", "name", "supplier", "price", "cost", "profit", "margin",
        "stock", "listing_title", "listing_description", "status",
    ])

    for p in rows:
        snap = product_launch_row(p, suppliers.get(p.supplier_id or ""))
        name = p.listing_title or p.name_ai or p.name_raw
        writer.writerow([
            p.sku or "",
            name,
            snap["supplier_name"] or "",
            p.selling_price or 0,
            p.cost_price or 0,
            snap["gross_profit"],
            snap["margin_percent"],
            p.stock_quantity or 0,
            p.listing_title or "",
            (p.listing_description or "")[:500],
            p.test_launch_status or "not_selected",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="tradepilot-test-launch.csv"'},
    )
