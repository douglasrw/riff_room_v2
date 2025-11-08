"""Practice session database models."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)


class Session(SQLModel, table=True):
    """Practice session model."""

    __tablename__ = "sessions"  # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    song_id: int = Field(foreign_key="songs.id", index=True)
    started_at: datetime = Field(default_factory=utc_now, index=True)
    ended_at: datetime | None = Field(default=None)
    duration_seconds: int | None = Field(default=None)
    loops_practiced: int = Field(default=0)
    stems_used: str | None = Field(
        default=None
    )  # JSON array of stem types used


class SessionCreate(SQLModel):
    """Schema for creating a new session."""

    song_id: int
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration_seconds: int | None = None
    loops_practiced: int = 0
    stems_used: str | None = None


class SessionUpdate(SQLModel):
    """Schema for updating a session."""

    ended_at: datetime | None = None
    duration_seconds: int | None = None
    loops_practiced: int | None = None
    stems_used: str | None = None
