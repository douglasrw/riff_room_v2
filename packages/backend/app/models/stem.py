"""Stem database model."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)

StemType = Literal["drums", "bass", "other", "vocals"]


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
