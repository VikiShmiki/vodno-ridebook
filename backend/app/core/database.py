"""SQLAlchemy engine, session factory and schema bootstrap helpers."""

import logging
import time
from collections.abc import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Arbitrary but stable identifier for the startup advisory lock.
BOOTSTRAP_LOCK_ID = 4711

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


@contextmanager
def bootstrap_lock() -> Generator[None, None, None]:
    """Serialise one-time startup work across backend replicas.

    Every replica runs the same bootstrap sequence at the same time in
    Kubernetes. A Postgres session-level advisory lock makes exactly one of
    them do the work while the others wait and then find it already done.
    The lock is released automatically if the process dies holding it.
    SQLite has no advisory locks and only ever runs single-process in the
    tests, so it is a no-op there.
    """
    if _is_sqlite:
        yield
        return

    with engine.connect() as connection:
        connection.execute(
            text("SELECT pg_advisory_lock(:lock_id)"), {"lock_id": BOOTSTRAP_LOCK_ID}
        )
        connection.commit()
        try:
            yield
        finally:
            connection.execute(
                text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": BOOTSTRAP_LOCK_ID}
            )
            connection.commit()


def init_schema() -> None:
    """Create any missing tables. Call inside bootstrap_lock()."""
    from app import models  # noqa: F401  (import registers the mappers)

    Base.metadata.create_all(bind=engine)
