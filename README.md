# TradePilot AI — Internal MVP

**Текущий статус: внутренний торговый инструмент команды**, а не публичный SaaS-продукт.
Цель первого MVP — дать команде проверить бизнес-модель онлайн-торговли без собственного
склада: подключить поставщика, импортировать его прайс, довести карточки товаров до ума с
помощью AI, посчитать наценку и прибыль, вручную провести заказы через демо-витрину и
посмотреть на аналитику.

Внешняя регистрация пользователей, тарифы и оплата сейчас сознательно не реализуются — это
следующий этап, когда бизнес-модель будет проверена. Архитектура при этом остаётся
SaaS-ready (см. `User.plan`, `User.role`, заготовку под лимиты и платные функции), чтобы не
переписывать её с нуля, когда придёт время превращать инструмент в продукт для внешних
пользователей.

This is a working MVP: a FastAPI backend, a Next.js (TypeScript + Tailwind) frontend,
a mock-but-pluggable AI service, and demo data — ready to be extended further in Cursor.

## Project structure

```
tradepilot-ai/
├── apps/
│   ├── api/              FastAPI backend
│   │   ├── app/
│   │   │   ├── routers/      REST endpoints (suppliers, products, orders, ai, ...)
│   │   │   ├── services/     ai_service.py (provider abstraction), pricing.py
│   │   │   ├── models.py     SQLAlchemy models
│   │   │   ├── schemas.py    Pydantic request/response schemas
│   │   │   ├── config.py     env-based settings
│   │   │   ├── seed.py       demo data
│   │   │   └── main.py       app entrypoint
│   │   └── requirements.txt
│   └── web/               Next.js frontend
│       └── src/
│           ├── app/          one folder per page (App Router)
│           ├── components/   Sidebar, Topbar, PageShell, ui.tsx primitives
│           ├── lib/           api.ts (API client), i18n-context.tsx, format.ts
│           ├── i18n/          ru.json / kz.json / en.json translation files
│           └── types/         shared TS types mirroring backend schemas
├── packages/shared/        cross-app constants (order statuses, plans, etc.)
├── docker-compose.yml
└── .env.example
```

## Quick start

### Option A — Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8010 (Swagger: http://localhost:8010/docs)
- Web: http://localhost:3010
- Demo data is seeded automatically on first run.

### Option B — Run locally without Docker

**Backend:**
```bash
cd apps/api
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # creates SQLite DB + demo data
uvicorn app.main:app --reload --port 8010
```

> **Windows note:** use `venv\Scripts\activate` instead of `source …/activate`.
> For local runs, Python **3.11–3.12** is recommended — pinned deps in `requirements.txt`
> may fail to build on Python 3.14 without MSVC/Rust. Docker (Option A) uses Python 3.11
> and avoids this.

**Frontend** (in a second terminal):
```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3010 (fixed dev port — avoids conflicts with other Next.js projects on :3000).

**If dev breaks after `npm run build`** (e.g. `Cannot find module './819.js'` — stale `.next` chunks):

```bash
cd apps/web
npm run dev:clean
```

This removes `apps/web/.next` and starts the dev server on port 3010. Works on Windows (PowerShell) and macOS/Linux.

## Netlify frontend

Frontend can be published on [Netlify](https://www.netlify.com/) without changing local dev ports (3010 / 8010).

**Repository settings (or use root `netlify.toml`):**

| Setting | Value |
|---|---|
| Base directory | `apps/web` |
| Build command | `npm ci && npm run build` |
| Plugin | `@netlify/plugin-nextjs` (declared in `netlify.toml`; Netlify installs it at build time) |

**Environment variable (Netlify site → Environment variables):**

```
NEXT_PUBLIC_API_URL=https://<public-backend-url>
```

The frontend reads this in `apps/web/src/lib/api.ts`. Local dev still defaults to `http://localhost:8010` when unset.

**Backend requirements for a live Netlify URL:**

- Backend must be deployed at a **public HTTPS URL** (localhost will not work from Netlify).
- Add the Netlify site origin to backend `CORS_ORIGINS` (e.g. `https://your-app.netlify.app`).

## What works in this MVP

Ordered by the team's current priority (internal trading tool, not a public SaaS yet):

1. **Internal admin panel** — single-workspace dashboard, no external login/registration.
2. **Suppliers** — list + add supplier.
3. **Import** — CSV and Excel (.xlsx) upload with preview (new/update/error rows) and upsert by supplier + SKU. PDF, Word, and OCR are planned for a later stage.
4. **AI Product Studio** — improve title, improve description, suggest category, suggest price,
   or run all four at once ("Optimize everything"), with a clear before/after view.
5. **Markup & profit calculation** — products carry cost/markup/selling price; orders compute
   profit per line item automatically.
6. **Storefront** — internal demo product grid used to simulate a sale, not a public storefront.
7. **Orders** — manual order creation from the storefront, status tracking, inline status changes.
8. **Profit Analytics** — revenue/cost/profit, average margin, top-profit and low-margin products.
9. **Channels (prep only)** — Kaspi, Wildberries, Ozon, Shopify, WooCommerce, Instagram, TikTok
   Shop, Custom API shown with status badges (not_connected / planned / connected). This is data
   model + UI groundwork for future marketplace integrations — nothing is connected yet.

Also included:
- **Dashboard** — totals, revenue, profit, average margin, recent orders, AI recommendations.
- **Products** — list, search, filter by supplier/category, one-click AI improve & price recalc.
- **Settings** — interface language (RU/KZ/EN), currency, default markup, company name. The
  "Plan" field is a placeholder for future SaaS tiers — it is not enforced anywhere in the MVP
  and has no effect on limits or billing today.
- **RU/KZ/EN localization** — all UI strings live in `apps/web/src/i18n/*.json`; switch language
  from the top bar, persisted in the browser. Kept from the start since the team itself is
  RU/KZ-speaking and this avoids a localization rewrite later.

## AI service

`apps/api/app/services/ai_service.py` defines an `AIProvider` interface with a `MockAIProvider`
(deterministic, no external calls, used by default) and an `OpenAIProvider` stub. To go live:

1. Set `AI_PROVIDER=openai` and `OPENAI_API_KEY` in `.env`.
2. Implement the four methods on `OpenAIProvider` using the OpenAI SDK (or any other LLM).
3. No router or frontend code needs to change — `get_ai_provider()` is the single switch point.

## What is intentionally stubbed / not implemented

Not needed yet because the team is the only user — revisit when/if this becomes an
external-facing product:

- External user registration, multi-tenant accounts, customer-facing auth.
- Payments and billing, tariff enforcement (the `plan` field exists but is not enforced).
- Real marketplace integrations (Kaspi/Wildberries/Ozon/Shopify/...) — UI and data model are
  ready, this is the next priority once the internal flow is validated.
- Full role-based permissions (the MVP runs as a single internal workspace; `User.role`/`User.plan`
  fields exist in the schema so this isn't a rewrite later).
- Warehouse management, real logistics, accounting.
- Production deployment / Kubernetes / microservices.

## Suggested next steps in Cursor

Internal-first priorities first, SaaS/monetization later:

1. Implement `OpenAIProvider` for real AI generation — biggest immediate value for the team.
2. Build real marketplace connectors behind the existing `MarketplaceChannel` model (Kaspi first,
   per the target market).
3. Add background jobs (Celery/RQ via the already-provisioned Redis) for async AI batch processing
   and large CSV imports.
4. Add Alembic migrations once the schema needs to evolve beyond `create_all`.
5. Add automated tests (pytest for the API, Playwright for the frontend).
6. Add lightweight internal auth (e.g. a single shared login) if the tool starts being used by
   more than one person on the team — still not full multi-tenant SaaS auth.

Later, once the business model is validated internally:

7. Add real authentication/registration, Stripe/local payment provider, and enforce plan limits.
8. Add a supplier portal and buyer-facing storefront as separate apps under `apps/`.
9. Open the product up as an external-facing SaaS.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy, Pydantic v2
- **Database:** PostgreSQL (SQLite fallback for zero-config local runs)
- **Cache/Queue:** Redis (provisioned in docker-compose, not yet used)
- **Infra:** Docker, docker-compose
