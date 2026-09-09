"""API router assembly. Everything is served under the /api prefix."""

from fastapi import APIRouter

from app.api import health, motorcycles, reports, rides, stats

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(rides.router)
api_router.include_router(reports.router)
api_router.include_router(motorcycles.router)
api_router.include_router(stats.router)

__all__ = ["api_router"]
