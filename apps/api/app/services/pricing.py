def calc_margin_percent(cost_price: float, selling_price: float) -> float:
    if not selling_price:
        return 0.0
    return round((selling_price - cost_price) / selling_price * 100, 1)


def calc_markup_percent(cost_price: float, selling_price: float) -> float:
    if not cost_price:
        return 0.0
    return round((selling_price - cost_price) / cost_price * 100, 1)


def price_from_markup(cost_price: float, markup_percent: float) -> float:
    return round(cost_price * (1 + markup_percent / 100), 2)
