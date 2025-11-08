"""RiffRoom ML Backend - FastAPI server for stem separation and audio processing."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from decouple import Config as DecoupleConfig
from decouple import RepositoryEnv
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes
from app.api import streak_routes
from app.api.websocket import websocket_endpoint
from app.database import create_db_and_tables

# Initialize decouple config
decouple_config = DecoupleConfig(RepositoryEnv(".env"))

# Configuration
API_BASE_URL = decouple_config("API_BASE_URL", default="http://localhost:8007")
CACHE_DIR = Path(decouple_config("CACHE_DIR", default="~/.riffroom/stems")).expanduser()
DEBUG = decouple_config("DEBUG", default=False, cast=bool)
# FIXED M6: Make CORS origins configurable via environment variable
CORS_ORIGINS = decouple_config(
    "CORS_ORIGINS",
    default="http://localhost:5173,http://localhost:3000"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan - setup and teardown."""
    # Startup
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize database tables
    create_db_and_tables()

    # Initialize Demucs processor
    routes.initialize_processor(CACHE_DIR)

    yield

    # Shutdown
    pass


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


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


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
