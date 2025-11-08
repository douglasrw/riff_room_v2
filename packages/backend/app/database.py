"""Database engine and session management."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine

# Database file location
DB_PATH = Path.home() / ".riffroom" / "riffroom.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Create engine
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    # FIXED: Proper SQLite configuration for thread safety and concurrency
    connect_args={
        "check_same_thread": False,  # Allow FastAPI thread pool
        "timeout": 30,  # 30s timeout for lock waits
    },
    pool_pre_ping=True,  # Verify connections before use
)


# Enable WAL mode for better concurrency (multiple readers + single writer)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    """Configure SQLite connection for better concurrency and durability."""
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
    cursor.execute("PRAGMA busy_timeout=30000")  # 30s timeout for locks
    cursor.execute("PRAGMA synchronous=NORMAL")  # Faster, still safe with WAL
    cursor.execute("PRAGMA foreign_keys=ON")  # Enforce foreign key constraints
    cursor.close()


def create_db_and_tables() -> None:
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session for dependency injection."""
    with Session(engine) as session:
        yield session
