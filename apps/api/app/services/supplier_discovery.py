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
        pros.append("open_price")
    else:
        score -= 15
        cons.append("no_price_list")

    if has_wholesale_terms:
        score += 20
        pros.append("wholesale_terms")
    else:
        score -= 10
        cons.append("no_wholesale_signs")

    contacts = sum(
        1 for c in (contact_phone, contact_email, whatsapp) if (c or "").strip()
    )
    if contacts >= 2:
        score += 25
        pros.append("multiple_contacts")
    elif contacts == 1:
        score += 15
        pros.append("has_contact")
    else:
        score -= 20
        cons.append("no_contacts")

    if (delivery_info or "").strip():
        score += 10
        pros.append("has_delivery")

    if _category_fits_quick_test(category):
        score += 15
        pros.append("quick_test_category")

    moq = min_order_quantity
    if moq is not None:
        if moq <= LOW_MOQ:
            score += 15
            pros.append(f"low_moq:{moq}")
        elif moq <= MID_MOQ:
            score += 8
            pros.append(f"moderate_moq:{moq}")
        elif moq > HIGH_MOQ:
            score -= 15
            cons.append(f"high_moq:{moq}")

    score = max(0, min(100, score))

    reason = f"fit|{'+'.join(pros)}|{'+'.join(cons)}"
    return score, reason.strip()
