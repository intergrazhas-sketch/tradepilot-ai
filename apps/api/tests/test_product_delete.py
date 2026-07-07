"""Tests for safe product deletion."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.services.product_service import (
    PRODUCT_HAS_ORDERS_CODE,
    delete_product_safe,
)


class ProductDeleteServiceTests(unittest.TestCase):
    @patch("app.services.product_service.product_has_orders", return_value=False)
    def test_delete_product_safe_without_orders(self, mock_has):
        db = MagicMock()
        product = SimpleNamespace(id="prod-1")
        delete_product_safe(db, product)
        mock_has.assert_called_once_with(db, "prod-1")
        db.delete.assert_called_once_with(product)

    @patch("app.services.product_service.product_has_orders", return_value=True)
    def test_delete_product_safe_with_orders_raises(self, mock_has):
        db = MagicMock()
        product = SimpleNamespace(id="prod-1")
        with self.assertRaises(ValueError) as ctx:
            delete_product_safe(db, product)
        self.assertEqual(str(ctx.exception), PRODUCT_HAS_ORDERS_CODE)
        db.delete.assert_not_called()


if __name__ == "__main__":
    unittest.main()
