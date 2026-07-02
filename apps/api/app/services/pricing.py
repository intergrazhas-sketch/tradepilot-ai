def calc_gross_profit(cost_price: float, selling_price: float) -> float:
    cost = cost_price or 0
    sell = selling_price or 0
    return round(sell - cost, 2)


def calc_margin_percent(cost_price: float, selling_price: float) -> float:
    sell = selling_price or 0
    if sell <= 0:
        return 0.0
    cost = cost_price or 0
    return round((sell - cost) / sell * 100, 1)


def calc_markup_percent(cost_price: float, selling_price: float) -> float:
    cost = cost_price or 0
    if cost <= 0:
        return 0.0
    sell = selling_price or 0
    return round((sell - cost) / cost * 100, 1)


def price_from_markup(cost_price: float, markup_percent: float) -> float:
    return round(cost_price * (1 + markup_percent / 100), 2)
