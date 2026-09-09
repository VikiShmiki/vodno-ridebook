"""Liveness and readiness endpoint used by Docker Compose and Kubernetes probes."""

from fastapi import APIRouter, Response, status
from sqlalchemy import text

from app import __version__
from app.core.config import get_settings
from app.core.database import engine
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(response: Response) -> HealthResponse:
    """Report process health together with database connectivity.

    Returns 503 when the database cannot be reached so that Kubernetes takes
    the pod out of the Service endpoints instead of routing traffic to it.
    """
    settings = get_settings()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_state = "connected"
    except Exception:  # noqa: BLE001 - any driver error means "not ready"
        database_state = "unavailable"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status="healthy" if database_state == "connected" else "degraded",
        database=database_state,
        version=__version__,
        environment=settings.app_env,
    )
