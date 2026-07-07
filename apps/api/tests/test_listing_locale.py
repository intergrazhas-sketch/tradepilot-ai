"""Tests for localized listing generation."""

import unittest
from types import SimpleNamespace

from app.services.listing_locale import (
    build_listing_description,
    build_listing_keywords,
    build_listing_title,
    localize_phrase,
)
from app.services.listing_service import generate_product_listing


def _product(**kwargs):
    defaults = dict(
        id="test-id",
        sku="EL-9001",
        name_raw="Bluetooth наушники TWS",
        description_raw="Беспроводные наушники с кейсом",
        category="Электроника",
        brand="SoundMax",
        cost_price=4500.0,
        selling_price=6200.0,
        stock_quantity=20,
        currency="KZT",
        name_ai=None,
        description_ai=None,
        listing_title=None,
        listing_description=None,
        listing_bullets=None,
        listing_keywords=None,
        listing_status="draft",
        listing_score=0,
        listing_notes=None,
        last_listing_generated_at=None,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class ListingLocaleTests(unittest.TestCase):
    def test_kz_headphones_title(self):
        title = build_listing_title(
            "Bluetooth наушники TWS",
            "SoundMax",
            "Электроника",
            "kz",
        )
        self.assertIn("SoundMax", title)
        self.assertIn("Bluetooth TWS құлаққап", title)
        self.assertIn("Техника", title)
        self.assertNotIn("Электроника", title)
        self.assertNotIn("наушники", title)

    def test_kz_category_not_russian(self):
        title = build_listing_title(
            "Bluetooth наушники TWS",
            "SoundMax",
            "Электроника",
            "kz",
        )
        keywords = build_listing_keywords(
            name_raw="Bluetooth наушники TWS",
            brand="SoundMax",
            category="Электроника",
            sku="EL-9001",
            locale="kz",
        )
        self.assertNotIn("Электроника", title)
        self.assertNotIn("Электроника", keywords)
        self.assertTrue("Техника" in title or "Электроника тауарлары" in title)
        self.assertTrue(keywords[0] in ("Техника", "Электроника тауарлары"))

    def test_en_headphones_description(self):
        title = build_listing_title(
            "Bluetooth наушники TWS",
            "SoundMax",
            "Электроника",
            "en",
        )
        desc = build_listing_description(
            title,
            "Беспроводные наушники с кейсом",
            "SoundMax",
            "en",
        )
        self.assertIn("Brand: SoundMax", desc)
        self.assertIn("Wireless headphones with case", desc)
        self.assertNotIn("Беспроводные", desc)
        self.assertNotIn("Бренд:", desc)

    def test_kz_keywords(self):
        keywords = build_listing_keywords(
            name_raw="Bluetooth наушники TWS",
            brand="SoundMax",
            category="Электроника",
            sku="EL-9001",
            locale="kz",
        )
        self.assertEqual(keywords[0], "Техника")
        self.assertNotIn("Электроника", keywords)
        self.assertIn("SoundMax", keywords)
        self.assertIn("EL-9001", keywords)
        self.assertTrue(any("құлаққап" in k for k in keywords))

    def test_cookware_en(self):
        title = build_listing_title(
            "Набор кастрюль 3 предмета",
            "HomeStyle",
            "Дом и быт",
            "en",
        )
        self.assertIn("3-piece cookware set", title)
        self.assertIn("Home & Kitchen", title)
        feature = localize_phrase("Антипригарное покрытие", "en")
        self.assertEqual(feature, "Non-stick coating")


class ListingServiceTests(unittest.TestCase):
    def test_generate_product_listing_kz(self):
        product = _product()
        result = generate_product_listing(product, locale="kz")
        self.assertIn("SoundMax", product.listing_title)
        self.assertNotIn("наушники", product.listing_title)
        self.assertIn("құлаққап", product.listing_title)
        self.assertNotIn("Электроника", product.listing_title)
        self.assertIn("Техника", product.listing_title)
        self.assertNotIn("Электроника", product.listing_keywords)
        self.assertEqual(product.listing_keywords[0], "Техника")
        self.assertNotIn("Беспроводные", product.listing_description)
        self.assertIn("Қаптамасы", product.listing_description)
        self.assertTrue(product.listing_bullets)
        self.assertTrue(any("SoundMax" in b for b in product.listing_bullets))
        self.assertTrue(all("наушники" not in b.lower() for b in product.listing_bullets))
        self.assertEqual(result["generated_with"], "rules")

    def test_generate_product_listing_en(self):
        product = _product()
        generate_product_listing(product, locale="en")
        self.assertIn("Electronics", product.listing_title)
        self.assertIn("Brand: SoundMax", product.listing_description)
        self.assertIn("Electronics", product.listing_keywords[0])


if __name__ == "__main__":
    unittest.main()
