from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas
from app.services.pricing import calc_margin_percent

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


VALID_STATUSES = {"new", "confirmed", "supplier_ordered", "delivered", "cancelled"}
LEGACY_STATUS_MAP = {
    "sent_to_supplier": "supplier_ordered",
    "shipped": "supplier_ordered",
    "completed": "delivered",
}


def _normalize_status(status: str) -> str:
    return LEGACY_STATUS_MAP.get(status, status)


def _to_order_out(order: models.Order) -> schemas.OrderOut:
    product_name = None
    supplier_name = None
    if order.product:
        product_name = order.product.name_ai or order.product.name_raw
    if order.supplier:
        supplier_name = order.supplier.name
    elif order.product and order.product.supplier:
        supplier_name = order.product.supplier.name

    gross = order.gross_profit or order.profit_amount
    margin = order.margin_percent
    if not margin and order.selling_price:
        margin = calc_margin_percent(order.cost_price or 0, order.selling_price or 0)

    return schemas.OrderOut(
        id=order.id,
        product_id=order.product_id,
        supplier_id=order.supplier_id,
        product_name=product_name,
        supplier_name=supplier_name,
        quantity=order.quantity or 1,
        customer_name=order.customer_name or "",
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        customer_note=order.customer_note,
        selling_price=order.selling_price or 0,
        cost_price=order.cost_price or 0,
        gross_profit=gross or 0,
        margin_percent=margin or 0,
        total_amount=order.total_amount or 0,
        cost_amount=order.cost_amount or 0,
        profit_amount=order.profit_amount or 0,
        status=_normalize_status(order.status),
        created_at=order.created_at,
        items=[schemas.OrderItemOut.model_validate(i) for i in order.items],
    )


@router.get("/summary", response_model=schemas.OrdersSummary)
def orders_summary(db: Session = Depends(get_db)):
    orders = db.query(models.Order).all()
    active = [o for o in orders if _normalize_status(o.status) != "cancelled"]
    margins = [
        o.margin_percent or calc_margin_percent(o.cost_price or 0, o.selling_price or 0)
        for o in active
        if (o.selling_price or o.total_amount)
    ]
    return schemas.OrdersSummary(
        total_orders=len(orders),
        new_orders=sum(1 for o in orders if _normalize_status(o.status) == "new"),
        confirmed_orders=sum(1 for o in orders if _normalize_status(o.status) == "confirmed"),
        delivered_orders=sum(1 for o in orders if _normalize_status(o.status) == "delivered"),
        cancelled_orders=sum(1 for o in orders if _normalize_status(o.status) == "cancelled"),
        total_revenue=round(sum(o.total_amount or 0 for o in active), 2),
        total_cost=round(sum(o.cost_amount or 0 for o in active), 2),
        total_profit=round(sum(o.profit_amount or 0 for o in active), 2),
        average_margin_percent=round(sum(margins) / len(margins), 1) if margins else 0.0,
    )


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(status: str | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(models.Order)
        .options(joinedload(models.Order.product).joinedload(models.Product.supplier))
        .options(joinedload(models.Order.supplier))
        .options(joinedload(models.Order.items))
    )
    orders = query.order_by(models.Order.created_at.desc()).all()
    if status:
        orders = [o for o in orders if _normalize_status(o.status) == status]
    return [_to_order_out(o) for o in orders]


@router.post("", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.ManualOrderCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(404, "Product not found")

    quantity = max(1, payload.quantity or 1)
    unit_sell = payload.selling_price if payload.selling_price is not None else (product.selling_price or 0)
    unit_cost = product.cost_price or 0
    line_profit = round((unit_sell - unit_cost) * quantity, 2)
    margin = calc_margin_percent(unit_cost, unit_sell)

    order = models.Order(
        product_id=product.id,
        supplier_id=product.supplier_id,
        quantity=quantity,
        customer_name=(payload.customer_name or "").strip(),
        customer_phone=payload.customer_phone,
        customer_note=payload.customer_note,
        selling_price=unit_sell,
        cost_price=unit_cost,
        gross_profit=line_profit,
        margin_percent=margin,
        total_amount=round(unit_sell * quantity, 2),
        cost_amount=round(unit_cost * quantity, 2),
        profit_amount=line_profit,
        status="new",
    )
    db.add(order)
    db.flush()

    db.add(
        models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            cost_price=unit_cost,
            selling_price=unit_sell,
            profit_amount=line_profit,
        )
    )
    product.stock_quantity = max(0, (product.stock_quantity or 0) - quantity)

    db.commit()
    db.refresh(order)
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.product).joinedload(models.Product.supplier))
        .options(joinedload(models.Order.supplier))
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order.id)
        .first()
    )
    return _to_order_out(order)


@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: str,
    payload: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    if payload.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Allowed: {sorted(VALID_STATUSES)}")

    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.product).joinedload(models.Product.supplier))
        .options(joinedload(models.Order.supplier))
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _to_order_out(order)


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.product).joinedload(models.Product.supplier))
        .options(joinedload(models.Order.supplier))
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")
    return _to_order_out(order)


@router.put("/{order_id}", response_model=schemas.OrderOut)
def update_order(order_id: str, payload: schemas.OrderUpdate, db: Session = Depends(get_db)):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.product).joinedload(models.Product.supplier))
        .options(joinedload(models.Order.supplier))
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(404, "Order not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        normalized = _normalize_status(data["status"])
        if normalized not in VALID_STATUSES:
            raise HTTPException(400, f"Invalid status. Allowed: {sorted(VALID_STATUSES)}")
        data["status"] = normalized

    for field, value in data.items():
        setattr(order, field, value)

    db.commit()
    db.refresh(order)
    return _to_order_out(order)
