"""SQLAlchemy engine, session factory and schema bootstrap helpers."""

import logging
import time
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# SQLite (used by the test suite) needs a different connect configuration than
# Postgres, which is what runs in Docker Compose and Kubernetes.
_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a request-scoped database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_database(attempts: int = 30, delay_seconds: float = 2.0) -> None:
    """Block until the database answers, so the pod does not crash-loop on a slow Postgres."""
    for attempt in range(1, attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            logger.info("Database reachable after %s attempt(s)", attempt)
            return
        except OperationalError as exc:
            if attempt == attempts:
                raise
            logger.warning("Database not ready (attempt %s/%s): %s", attempt, attempts, exc)
            time.sleep(delay_seconds)


def init_schema() -> None:
    """Create missing tables.

    Multiple backend replicas start at the same time in Kubernetes, so the
    CREATE TABLE pass is wrapped in a Postgres advisory lock to make exactly
    one replica perform it. SQLite has no advisory locks and only ever runs
    single-process in the tests, so it skips straight to create_all.
    """
    from app import models  # noqa: F401  (import registers the mappers)

    if _is_sqlite:
        Base.metadata.create_all(bind=engine)
        return

    lock_id = 4711  # arbitrary but stable identifier for this application
    with engine.begin() as connection:
        connection.execute(text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": lock_id})
        try:
            Base.metadata.create_all(bind=connection)
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": lock_id})
