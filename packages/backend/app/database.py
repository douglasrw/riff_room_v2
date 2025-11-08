"""Database engine and session management."""

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

# Database file location
DB_PATH = Path.home() / ".riffroom" / "riffroom.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# Create engine
DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    connect_args={"check_same_thread": False},  # Needed for SQLite
)


def create_db_and_tables() -> None:
    """Create all database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session for dependency injection."""
    with Session(engine) as session:
        yield session
