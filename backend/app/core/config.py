"""Application configuration, loaded from environment variables."""

from functools import lru_cache

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings.

    Every value can be overridden with an environment variable of the same
    name (case-insensitive), which is how Docker Compose and the Kubernetes
    ConfigMap/Secret pair inject configuration.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Vodno Ridebook API"
    app_env: str = "development"
    log_level: str = "info"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "vodno"
    postgres_user: str = "vodno"
    postgres_password: str = "vodno"

    # Set directly to bypass the assembled Postgres URL (used by the test suite).
    database_url_override: str | None = Field(default=None, alias="DATABASE_URL")

    # Comma-separated list of origins allowed to call the API from a browser.
    cors_origins: str = "*"

    # Insert a small set of demo rows on first startup when the tables are empty.
    seed_data: bool = False

    @computed_field
    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
