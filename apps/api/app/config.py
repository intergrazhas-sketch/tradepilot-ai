"""
Application configuration.

All secrets and environment-specific values are read from environment
variables (see .env.example). Nothing here is hardcoded.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # General
    APP_NAME: str = "TradePilot AI"
    ENV: str = "development"

    # Database - defaults to local SQLite for zero-config MVP runs.
    # In docker-compose this is overridden to point at the Postgres service.
    DATABASE_URL: str = "sqlite:///./tradepilot.db"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3010,http://127.0.0.1:3010"

    # AI provider abstraction.
    # If AI_PROVIDER=mock (default), the built-in deterministic mock AI is used.
    # If AI_PROVIDER=openai and OPENAI_API_KEY is set, real LLM calls can be wired in
    # apps/api/app/services/ai_service.py without changing any router code.
    AI_PROVIDER: str = "mock"
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Business defaults
    DEFAULT_MARKUP_PERCENT: float = 35.0
    DEFAULT_MIN_MARGIN_PERCENT: float = 15.0
    DEFAULT_CURRENCY: str = "KZT"

    # Supplier web search providers (SerpAPI / Bing). Default disabled — no fake results.
    SUPPLIER_SEARCH_PROVIDER: str = "disabled"
    SERPAPI_API_KEY: str | None = None
    BING_SEARCH_API_KEY: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
