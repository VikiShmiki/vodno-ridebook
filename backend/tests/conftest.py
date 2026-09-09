"""Shared pytest fixtures.

The suite runs against a throwaway SQLite file by default so it needs no
running services, and against the Postgres service container in CI when
DATABASE_URL is exported by the workflow.
"""

import os
import tempfile
from collections.abc import Generator
from pathlib import Path

import pytest

_TMP_DB = Path(tempfile.gettempdir()) / "vodno_test.db"
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TMP_DB}")
os.environ["SEED_DATA"] = "false"
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database() -> Generator[None, None, None]:
    """Give every test an empty schema."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
