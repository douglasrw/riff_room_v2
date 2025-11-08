"""Stem database model."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)


class StemType(str, Enum):
    """Stem types for separated audio."""

    DRUMS = "drums"
    BASS = "bass"
    OTHER = "other"
    VOCALS = "vocals"


class Stem(SQLModel, table=True):
    """Stem file metadata model."""

    __tablename__ = "stems"  # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="songs.id", index=True)
    stem_type: StemType = Field(index=True)
    file_path: str
    created_at: datetime = Field(default_factory=utc_now)


class StemCreate(SQLModel):
    """Schema for creating a new stem."""

    song_id: int
    stem_type: StemType
    file_path: str
