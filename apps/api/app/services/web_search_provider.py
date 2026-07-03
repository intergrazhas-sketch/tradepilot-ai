"""External web search providers for supplier discovery (SerpAPI / Bing)."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from app.config import get_settings

VALID_PROVIDERS = {"disabled", "serpapi", "bing"}
DEFAULT_LIMIT = 5
MAX_QUERIES_PER_RUN = 3

SCORE_KEYWORDS: list[tuple[str, int]] = [
    ("price list", 15),
    ("open price", 12),
    ("wholesale", 12),
    ("прайс-лист", 15),
    ("прайс", 12),
    ("оптов", 12),
    ("опт", 10),
    ("xlsx", 10),
    ("excel", 10),
    ("whatsapp", 10),
    ("доставка", 8),
    ("delivery", 8),
    ("moq", 10),
    ("supplier", 8),
    ("поставщик", 8),
    ("b2b", 10),
    ("жеткізуші", 8),
]

PRICE_HINTS = ("price list", "прайс", "xlsx", "excel", "catalog", "каталог", "прайс-лист")
WHOLESALE_HINTS = ("wholesale", "опт", "оптов", "b2b", "bulk", "коптом")
CONTACT_HINTS = ("whatsapp", "wa.me", "tel:", "phone", "email", "@", "+7", "тел")


@dataclass
class WebSearchHit:
    title: str
    url: str
    snippet: str
    source: str
    query: str
    rank: int


def _provider_setting() -> str:
    raw = (get_settings().SUPPLIER_SEARCH_PROVIDER or "disabled").strip().lower()
    return raw if raw in VALID_PROVIDERS else "disabled"


def _has_key(provider: str) -> bool:
    settings = get_settings()
    if provider == "serpapi":
        return bool((settings.SERPAPI_API_KEY or "").strip())
    if provider == "bing":
        return bool((settings.BING_SEARCH_API_KEY or "").strip())
    return False


def get_search_provider_status() -> dict:
    provider = _provider_setting()
    if provider == "disabled":
        return {
            "configured": False,
            "provider": "disabled",
            "message": "Live search provider is disabled. Set SUPPLIER_SEARCH_PROVIDER to serpapi or bing.",
        }
    if not _has_key(provider):
        return {
            "configured": False,
            "provider": provider,
            "message": f"{provider} selected but API key is missing. Add the key to environment variables.",
        }
    return {
        "configured": True,
        "provider": provider,
        "message": f"Live search via {provider} is ready.",
    }


def _http_get_json(url: str, headers: dict | None = None, timeout: int = 20) -> dict:
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def _search_serpapi(query: str, limit: int) -> list[WebSearchHit]:
    key = get_settings().SERPAPI_API_KEY.strip()
    params = urllib.parse.urlencode({
        "engine": "google",
        "q": query,
        "api_key": key,
        "num": limit,
    })
    data = _http_get_json(f"https://serpapi.com/search.json?{params}")
    hits: list[WebSearchHit] = []
    for item in data.get("organic_results") or []:
        hits.append(WebSearchHit(
            title=item.get("title") or "",
            url=item.get("link") or "",
            snippet=item.get("snippet") or "",
            source="serpapi",
            query=query,
            rank=int(item.get("position") or len(hits) + 1),
        ))
        if len(hits) >= limit:
            break
    return hits


def _search_bing(query: str, limit: int) -> list[WebSearchHit]:
    key = get_settings().BING_SEARCH_API_KEY.strip()
    params = urllib.parse.urlencode({"q": query, "count": limit})
    data = _http_get_json(
        f"https://api.bing.microsoft.com/v7.0/search?{params}",
        headers={"Ocp-Apim-Subscription-Key": key},
    )
    hits: list[WebSearchHit] = []
    for idx, item in enumerate(data.get("webPages", {}).get("value") or [], start=1):
        hits.append(WebSearchHit(
            title=item.get("name") or "",
            url=item.get("url") or "",
            snippet=item.get("snippet") or "",
            source="bing",
            query=query,
            rank=idx,
        ))
        if len(hits) >= limit:
            break
    return hits


def run_supplier_search(
    query: str,
    *,
    country: str | None = None,
    language: str | None = None,
    limit: int = DEFAULT_LIMIT,
) -> dict:
    """Run a live web search. Returns configured flag and hits (empty if unavailable)."""
    status = get_search_provider_status()
    if not status["configured"]:
        return {
            "configured": False,
            "provider": status["provider"],
            "message": status["message"],
            "results": [],
        }

    provider = status["provider"]
    q = query.strip()
    if country:
        q = f"{q} {country.strip()}"
    if not q:
        return {
            "configured": True,
            "provider": provider,
            "message": "Query is empty.",
            "results": [],
        }

    try:
        if provider == "serpapi":
            hits = _search_serpapi(q, limit)
        else:
            hits = _search_bing(q, limit)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        return {
            "configured": True,
            "provider": provider,
            "message": f"Search API error ({e.code}): {body}",
            "results": [],
        }
    except Exception as e:
        return {
            "configured": True,
            "provider": provider,
            "message": f"Search failed: {e}",
            "results": [],
        }

    return {
        "configured": True,
        "provider": provider,
        "message": f"Found {len(hits)} result(s).",
        "results": [
            {
                "title": h.title,
                "url": h.url,
                "snippet": h.snippet,
                "source": h.source,
                "query": h.query,
                "rank": h.rank,
            }
            for h in hits if h.title and h.url
        ],
    }


def _extract_name(title: str) -> str:
    cleaned = re.sub(r"\s[-|–—:]\s.*$", "", title.strip())
    return cleaned[:120] if cleaned else title[:120]


def score_search_result(title: str, url: str, snippet: str) -> tuple[int, str, bool, bool, bool]:
    text = f"{title} {url} {snippet}".lower()
    score = 25
    for keyword, pts in SCORE_KEYWORDS:
        if keyword in text:
            score += pts

    possible_price_list = any(k in text for k in PRICE_HINTS)
    possible_wholesale = any(k in text for k in WHOLESALE_HINTS)
    possible_contacts = any(k in text for k in CONTACT_HINTS)

    if possible_price_list:
        score += 10
    if possible_wholesale:
        score += 10
    if possible_contacts:
        score += 8

    return min(100, score), _extract_name(title), possible_price_list, possible_wholesale, possible_contacts
