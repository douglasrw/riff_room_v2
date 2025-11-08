"""RiffRoom ML Backend - FastAPI server for stem separation and audio processing."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import torch
from decouple import Config as DecoupleConfig
from decouple import RepositoryEnv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.api import routes
from app.api import streak_routes
from app.api import health
from app.api.websocket import websocket_endpoint
from app.core.logging_config import get_logger, setup_logging
from app.database import DB_PATH, create_db_and_tables

# Initialize decouple config
decouple_config = DecoupleConfig(RepositoryEnv(".env"))

# Configuration
API_BASE_URL = decouple_config("API_BASE_URL", default="http://localhost:8007")
CACHE_DIR = Path(decouple_config("CACHE_DIR", default="~/.riffroom/stems")).expanduser()
DEBUG = decouple_config("DEBUG", default=False, cast=bool)
LOG_LEVEL = decouple_config("LOG_LEVEL", default="DEBUG" if DEBUG else "INFO")
LOG_FILE = decouple_config("LOG_FILE", default=None)
# FIXED M6: Make CORS origins configurable via environment variable
CORS_ORIGINS = decouple_config(
    "CORS_ORIGINS",
    default="http://localhost:5173,http://localhost:3000"
).split(",")

# FIXED L3: Initialize logging infrastructure
if LOG_FILE:
    log_file_path = Path(LOG_FILE).expanduser()
else:
    log_file_path = None

setup_logging(
    level=LOG_LEVEL,
    log_file=log_file_path,
    rich_tracebacks=True,
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan - setup and teardown."""
    # Startup
    logger.info("🎸 Starting RiffRoom Backend")
    logger.info(f"Cache directory: {CACHE_DIR}")
    logger.info(f"CORS origins: {', '.join(CORS_ORIGINS)}")
    logger.info(f"Debug mode: {DEBUG}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize database tables
    logger.info("Initializing database...")
    create_db_and_tables()

    # Initialize Demucs processor
    logger.info("Loading Demucs ML model...")
    routes.initialize_processor(CACHE_DIR)
    logger.info("✓ RiffRoom Backend ready")

    yield

    # Shutdown
    logger.info("Shutting down RiffRoom Backend")


app = FastAPI(
    title="RiffRoom Backend",
    description="ML-powered stem separation for music practice",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
# FIXED M6: Use configurable origins instead of hardcoded values
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes.router, prefix="/api", tags=["processing"])
app.include_router(streak_routes.router, prefix="/api", tags=["streaks"])
app.include_router(health.router, tags=["health"])


# Legacy health endpoint - redirects to new comprehensive health check
# Kept for backward compatibility
@app.get("/health/detailed")
async def health_check_detailed() -> dict[str, object]:
    """
    Legacy detailed health check endpoint.

    DEPRECATED: Use /health instead for comprehensive health checks.
    This endpoint is maintained for backward compatibility.
    """
    from app.api.health import health_check

    result = await health_check()
    return result.model_dump()


@app.websocket("/ws/{client_id}")
async def websocket_handler(websocket: WebSocket, client_id: str) -> None:
    """WebSocket connection handler.

    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier
    """
    await websocket_endpoint(websocket, client_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # noqa: S104
        port=8007,
        reload=DEBUG,
    )
