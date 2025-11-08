"""Song database model."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)


class Song(SQLModel, table=True):
    """Song metadata model."""

    __tablename__ = "songs"  # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    artist: str | None = Field(default=None)
    file_path: str = Field(unique=True)
    file_hash: str = Field(unique=True, index=True)
    duration_seconds: float | None = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    processed_at: datetime | None = Field(default=None)


class SongCreate(SQLModel):
    """Schema for creating a new song."""

    title: str
    artist: str | None = None
    file_path: str
    file_hash: str
    duration_seconds: float | None = None
