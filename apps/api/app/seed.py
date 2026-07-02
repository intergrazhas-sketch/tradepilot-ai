"""
Seed demo data so the MVP is immediately demoable.

Run with: python -m app.seed
"""
from app.database import SessionLocal, engine, Base
from app import models

DEMO_SUPPLIERS = [
    dict(name="Almaty Electronics Wholesale", contact_name="Daulet Nurlanov", phone="+7 701 111 2233",
         email="sales@almatyelectronics.kz", country="Kazakhstan", city="Almaty", status="active",
         notes="Опт по электронике, минимальная партия от 10 шт."),
    dict(name="Astana Home Goods", contact_name="Aigerim Bekova", phone="+7 701 222 3344",
         email="orders@astanahome.kz", country="Kazakhstan", city="Astana", status="active",
         notes="Товары для дома, доставка по СНГ."),
    dict(name="Central Asia Fashion Supplier", contact_name="Bekzat Aliyev", phone="+7 701 333 4455",
         email="wholesale@cafashion.kz", country="Kazakhstan", city="Shymkent", status="active",
         notes="Одежда и аксессуары, сезонные коллекции."),
]

DEMO_PRODUCTS = [
    # Electronics (Almaty Electronics Wholesale)
    dict(sku="EL-1001", name_raw="наушники bluetooth NEW!! беспроводные черные", category="Электроника",
         brand="SoundMax", cost_price=4500, stock_quantity=42, currency="KZT",
         description_raw="беспроводные наушники с чехлом"),
    dict(sku="EL-1002", name_raw="powerbank 20000mah быстрая зарядка ХИТ", category="Электроника",
         brand="PowerPlus", cost_price=6200, stock_quantity=3, currency="KZT",
         description_raw="портативный аккумулятор 20000 мач"),
    dict(sku="EL-1003", name_raw="смарт часы фитнес браслет", category="Электроника",
         brand="FitTrack", cost_price=8900, stock_quantity=15, currency="KZT",
         description_raw=None),
    # Home goods (Astana Home Goods)
    dict(sku="HM-2001", name_raw="набор кастрюль 5 предметов АКЦИЯ", category="Дом и быт",
         brand="HomeStyle", cost_price=15000, stock_quantity=8, currency="KZT",
         description_raw="набор кастрюль с антипригарным покрытием"),
    dict(sku="HM-2002", name_raw="подушка ортопедическая для сна", category="Дом и быт",
         brand=None, cost_price=5200, stock_quantity=2, currency="KZT",
         description_raw=None),
    dict(sku="HM-2003", name_raw="led лампа настольная   с регулировкой", category="Дом и быт",
         brand="BrightHome", cost_price=3100, stock_quantity=25, currency="KZT",
         description_raw="настольная led лампа с регулировкой яркости"),
    # Fashion (Central Asia Fashion Supplier)
    dict(sku="FS-3001", name_raw="футболка хлопок мужская TOP", category="Одежда",
         brand="UrbanWear", cost_price=2800, stock_quantity=60, currency="KZT",
         description_raw=None),
    dict(sku="FS-3002", name_raw="куртка демисезонная женская", category="Одежда",
         brand=None, cost_price=12500, stock_quantity=4, currency="KZT",
         description_raw="легкая демисезонная куртка"),
    dict(sku="FS-3003", name_raw="сумка кожаная женская ****", category="Аксессуары",
         brand="LeatherCraft", cost_price=9800, stock_quantity=10, currency="KZT",
         description_raw=None),
]

DEMO_CHANNELS = [
    dict(name="Kaspi.kz", type="marketplace", status="planned", config_json={}),
    dict(name="Wildberries", type="marketplace", status="planned", config_json={}),
    dict(name="Ozon", type="marketplace", status="not_connected", config_json={}),
    dict(name="Shopify", type="marketplace", status="not_connected", config_json={}),
    dict(name="WooCommerce", type="marketplace", status="not_connected", config_json={}),
    dict(name="Instagram", type="social", status="planned", config_json={}),
    dict(name="TikTok Shop", type="social", status="not_connected", config_json={}),
    dict(name="Custom API", type="custom_api", status="not_connected", config_json={}),
]


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Supplier).count() > 0:
            print("Demo data already present, skipping seed.")
            return

        supplier_objs = []
        for s in DEMO_SUPPLIERS:
            obj = models.Supplier(**s)
            db.add(obj)
            supplier_objs.append(obj)
        db.flush()

        # naive distribution: electronics -> supplier 0, home -> supplier 1, fashion -> supplier 2
        category_to_supplier = {
            "Электроника": supplier_objs[0],
            "Дом и быт": supplier_objs[1],
            "Одежда": supplier_objs[2],
            "Аксессуары": supplier_objs[2],
        }

        product_objs = []
        for p in DEMO_PRODUCTS:
            supplier = category_to_supplier.get(p["category"], supplier_objs[0])
            markup = 35.0
            selling_price = round(p["cost_price"] * (1 + markup / 100), -1) or round(p["cost_price"] * 1.35, 2)
            product = models.Product(
                supplier_id=supplier.id,
                sku=p["sku"],
                name_raw=p["name_raw"],
                description_raw=p["description_raw"],
                category=p["category"],
                brand=p["brand"],
                cost_price=p["cost_price"],
                selling_price=selling_price,
                markup_percent=markup,
                stock_quantity=p["stock_quantity"],
                currency=p["currency"],
                status="active",
            )
            db.add(product)
            product_objs.append(product)
        db.flush()

        # Demo orders with varied statuses
        order_specs = [
            ("Madina Yerlanova", "+7 707 555 1212", "new", [(product_objs[0], 1), (product_objs[2], 1)]),
            ("Sergey Petrov", "+7 707 555 1313", "confirmed", [(product_objs[3], 1)]),
            ("Aliya Sadykova", "+7 707 555 1414", "shipped", [(product_objs[6], 2)]),
            ("Yerbol Tasbolatov", "+7 707 555 1515", "completed", [(product_objs[8], 1), (product_objs[1], 1)]),
            ("Dana Akhmetova", "+7 707 555 1616", "cancelled", [(product_objs[7], 1)]),
        ]

        for customer_name, phone, status, items in order_specs:
            order = models.Order(customer_name=customer_name, customer_phone=phone, status=status)
            db.add(order)
            db.flush()

            total = 0.0
            cost = 0.0
            for product, qty in items:
                line_cost = product.cost_price * qty
                line_sell = product.selling_price * qty
                db.add(models.OrderItem(
                    order_id=order.id, product_id=product.id, quantity=qty,
                    cost_price=product.cost_price, selling_price=product.selling_price,
                    profit_amount=line_sell - line_cost,
                ))
                total += line_sell
                cost += line_cost

            order.total_amount = total
            order.cost_amount = cost
            order.profit_amount = total - cost

        for c in DEMO_CHANNELS:
            db.add(models.MarketplaceChannel(**c))

        if not db.query(models.PlatformSettings).filter(models.PlatformSettings.id == "default").first():
            db.add(models.PlatformSettings(id="default", language="ru", currency="KZT",
                                            default_markup_percent=35.0, plan="free",
                                            company_name="Demo Store"))
        else:
            settings = db.query(models.PlatformSettings).filter(models.PlatformSettings.id == "default").first()
            settings.company_name = "Demo Store"

        db.commit()
        print("Demo data seeded successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
