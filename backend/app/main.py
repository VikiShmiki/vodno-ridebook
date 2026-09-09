"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import api_router
from app.core.config import get_settings
from app.core.database import init_schema, wait_for_database

settings = get_settings()
logging.basicConfig(
    level=settings.log_level.upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("vodno")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Prepare the database before the process starts serving traffic."""
    wait_for_database()
    init_schema()
    if settings.seed_data:
        from app.core.seed import seed_if_empty

        seed_if_empty()
    logger.info("Vodno Ridebook API %s started in %s mode", __version__, settings.app_env)
    yield


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Road condition reports and ride log for the Sredno Vodno road in Skopje.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": settings.app_name, "version": __version__, "docs": "/api/docs"}
