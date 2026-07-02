from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])

VALID_STATUSES = {"new", "sent_to_supplier", "confirmed", "shipped", "completed", "cancelled"}


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    return query.order_by(models.Order.created_at.desc()).all()


@router.post("", response_model=schemas.OrderOut, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(400, "Заказ должен содержать хотя бы один товар")

    order = models.Order(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        status="new",
    )
    db.add(order)
    db.flush()

    total_amount = 0.0
    cost_amount = 0.0

    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(404, f"Товар {item.product_id} не найден")

        line_cost = product.cost_price * item.quantity
        line_sell = product.selling_price * item.quantity
        line_profit = line_sell - line_cost

        order_item = models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            cost_price=product.cost_price,
            selling_price=product.selling_price,
            profit_amount=line_profit,
        )
        db.add(order_item)

        total_amount += line_sell
        cost_amount += line_cost

        # naive stock decrement, never below zero
        product.stock_quantity = max(0, product.stock_quantity - item.quantity)

    order.total_amount = total_amount
    order.cost_amount = cost_amount
    order.profit_amount = total_amount - cost_amount

    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@router.put("/{order_id}", response_model=schemas.OrderOut)
def update_order(order_id: str, payload: schemas.OrderUpdate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    data = payload.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_STATUSES:
        raise HTTPException(400, f"Недопустимый статус. Доступные: {sorted(VALID_STATUSES)}")

    for field, value in data.items():
        setattr(order, field, value)

    db.commit()
    db.refresh(order)
    return order
