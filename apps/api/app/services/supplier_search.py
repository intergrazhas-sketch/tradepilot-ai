"""Search query generation for supplier discovery (manual search workflow)."""

VALID_LANGUAGES = {"ru", "kz", "en"}


def _loc_parts(country: str | None, city: str | None, language: str) -> str:
    parts = [p for p in (city, country) if (p or "").strip()]
    if not parts:
        return ""
    if language == "en":
        return " ".join(parts)
    return " ".join(parts)


def generate_search_queries(
    *,
    category: str,
    country: str | None = None,
    city: str | None = None,
    language: str = "ru",
    required_open_price_list: bool = True,
    required_wholesale: bool = True,
    search_goal: str | None = None,
) -> list[str]:
    cat = category.strip()
    loc = _loc_parts(country, city, language)
    lang = language if language in VALID_LANGUAGES else "ru"
    queries: list[str] = []

    if lang == "ru":
        base = [
            f"{cat} оптовый прайс {loc}".strip(),
            f"{cat} wholesale price list {loc}".strip(),
            f"{cat} оптом WhatsApp {loc}".strip(),
            f"{cat} поставщик прайс excel {loc}".strip(),
            f"{cat} прайс лист xlsx {loc}".strip(),
            f"{cat} b2b supplier {loc}".strip(),
            f"{cat} open price list {loc}".strip(),
            f"{cat} MOQ delivery wholesale {loc}".strip(),
            f"{cat} оптом без склада {loc}".strip(),
            f"{cat} трендовый товар поставщик {loc}".strip(),
        ]
        if required_open_price_list:
            base.extend([
                f"{cat} открытый прайс опт {loc}".strip(),
                f"{cat} скачать прайс excel опт {loc}".strip(),
            ])
        if required_wholesale:
            base.extend([
                f"{cat} оптовые условия поставщик {loc}".strip(),
                f"{cat} опт от 1 штуки {loc}".strip(),
            ])
        queries = base
    elif lang == "kz":
        base = [
            f"{cat} опттық прайс {loc}".strip(),
            f"{cat} wholesale price list {loc}".strip(),
            f"{cat} оптом WhatsApp {loc}".strip(),
            f"{cat} жеткізуші прайс excel {loc}".strip(),
            f"{cat} прайс тізімі xlsx {loc}".strip(),
            f"{cat} b2b supplier {loc}".strip(),
            f"{cat} open price list {loc}".strip(),
            f"{cat} MOQ delivery wholesale {loc}".strip(),
            f"{cat} қоймасыз сауда {loc}".strip(),
            f"{cat} тренд тауар жеткізуші {loc}".strip(),
        ]
        if required_open_price_list:
            base.extend([
                f"{cat} ашық прайс опт {loc}".strip(),
                f"{cat} прайс жүктеу excel {loc}".strip(),
            ])
        if required_wholesale:
            base.extend([
                f"{cat} опттық шарттар {loc}".strip(),
                f"{cat} төмен MOQ {loc}".strip(),
            ])
        queries = base
    else:
        base = [
            f"{cat} wholesale price list {loc}".strip(),
            f"{cat} open price list {loc}".strip(),
            f"{cat} wholesale supplier {loc}".strip(),
            f"{cat} b2b supplier price list excel {loc}".strip(),
            f"{cat} xlsx price list wholesale {loc}".strip(),
            f"{cat} WhatsApp wholesale {loc}".strip(),
            f"{cat} MOQ delivery wholesale {loc}".strip(),
            f"{cat} dropshipping supplier {loc}".strip(),
            f"{cat} trending product supplier {loc}".strip(),
        ]
        if required_open_price_list:
            base.extend([
                f"{cat} public wholesale price list {loc}".strip(),
                f"{cat} download wholesale catalog {loc}".strip(),
            ])
        if required_wholesale:
            base.extend([
                f"{cat} bulk order terms {loc}".strip(),
                f"{cat} low MOQ wholesale {loc}".strip(),
            ])
        queries = base

    if (search_goal or "").strip():
        queries.insert(0, f"{cat} {search_goal.strip()} {loc}".strip())

    seen: set[str] = set()
    unique: list[str] = []
    for q in queries:
        qn = " ".join(q.split())
        if qn and qn not in seen:
            seen.add(qn)
            unique.append(qn)
    return unique
