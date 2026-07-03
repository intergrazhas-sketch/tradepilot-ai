"""Supplier lead fit scoring for no-warehouse trading model."""

QUICK_TEST_CATEGORIES = {
    "электроника", "electronics", "аксессуары", "accessories", "дом", "home",
    "красота", "beauty", "одежда", "fashion", "спорт", "sport", "игрушки", "toys",
    "авто", "auto", "канцтовары", "office", "кухня", "kitchen", "текстиль", "textile",
}

HIGH_MOQ = 100
LOW_MOQ = 10
MID_MOQ = 50


def _has_contact(phone: str | None, email: str | None, whatsapp: str | None) -> bool:
    return bool((phone or "").strip() or (email or "").strip() or (whatsapp or "").strip())


def _category_fits_quick_test(category: str | None) -> bool:
    if not category:
        return False
    cat = category.lower().strip()
    return any(k in cat for k in QUICK_TEST_CATEGORIES)


def calc_supplier_fit_score(
    *,
    has_open_price_list: bool = False,
    has_wholesale_terms: bool = False,
    contact_phone: str | None = None,
    contact_email: str | None = None,
    whatsapp: str | None = None,
    delivery_info: str | None = None,
    category: str | None = None,
    min_order_quantity: int | None = None,
    price_list_url: str | None = None,
) -> tuple[int, str]:
    score = 50
    pros: list[str] = []
    cons: list[str] = []

    if has_open_price_list or (price_list_url or "").strip():
        score += 25
        pros.append("открытый прайс")
    else:
        score -= 15
        cons.append("нет прайса")

    if has_wholesale_terms:
        score += 20
        pros.append("оптовые условия")
    else:
        score -= 10
        cons.append("нет признаков опта")

    contacts = sum(
        1 for c in (contact_phone, contact_email, whatsapp) if (c or "").strip()
    )
    if contacts >= 2:
        score += 25
        pros.append("несколько контактов")
    elif contacts == 1:
        score += 15
        pros.append("есть контакт")
    else:
        score -= 20
        cons.append("нет контактов")

    if (delivery_info or "").strip():
        score += 10
        pros.append("есть доставка")

    if _category_fits_quick_test(category):
        score += 15
        pros.append("категория для быстрого теста")

    moq = min_order_quantity
    if moq is not None:
        if moq <= LOW_MOQ:
            score += 15
            pros.append(f"низкий MOQ ({moq})")
        elif moq <= MID_MOQ:
            score += 8
            pros.append(f"умеренный MOQ ({moq})")
        elif moq > HIGH_MOQ:
            score -= 15
            cons.append(f"высокий MOQ ({moq})")

    score = max(0, min(100, score))

    if pros and not cons:
        reason = "Подходит: " + ", ".join(pros[:4])
    elif cons and not pros:
        reason = "Риск: " + ", ".join(cons[:4])
    else:
        reason = "Плюсы: " + ", ".join(pros[:3]) if pros else ""
        if cons:
            reason += ("; минусы: " + ", ".join(cons[:3])) if reason else "Минусы: " + ", ".join(cons[:3])

    return score, reason.strip()
