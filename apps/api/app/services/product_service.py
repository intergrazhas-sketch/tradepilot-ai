"""Product lifecycle helpers."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app import models

PRODUCT_HAS_ORDERS_CODE = "product_has_orders"


def product_has_orders(db: Session, product_id: str) -> bool:
    """True if product is referenced by any order or order item."""
    direct = (
        db.query(models.Order.id)
        .filter(models.Order.product_id == product_id)
        .first()
    )
    if direct:
        return True
    item = (
        db.query(models.OrderItem.id)
        .filter(models.OrderItem.product_id == product_id)
        .first()
    )
    return item is not None


def delete_product_safe(db: Session, product: models.Product) -> None:
    """
    Delete product when it has no orders.

    Listing and test-launch state live on the product row; removing the product
    clears them from Products, Best Products, Listing Ready, and Storefront lists.
    """
    if product_has_orders(db, product.id):
        raise ValueError(PRODUCT_HAS_ORDERS_CODE)
    db.delete(product)
