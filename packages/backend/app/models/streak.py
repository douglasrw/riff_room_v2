"""Practice streak database models."""

from __future__ import annotations

from datetime import date

from sqlmodel import Field, SQLModel


class Streak(SQLModel, table=True):
    """Daily practice streak model."""

    __tablename__ = "streaks"  # type: ignore[assignment]

    date: date = Field(primary_key=True)
    practice_time_seconds: int = Field(default=0)
    songs_practiced: int = Field(default=0)
    sessions_count: int = Field(default=0)


class StreakCreate(SQLModel):
    """Schema for creating a new streak record."""

    date: date
    practice_time_seconds: int = 0
    songs_practiced: int = 0
    sessions_count: int = 0


class StreakUpdate(SQLModel):
    """Schema for updating a streak record."""

    practice_time_seconds: int | None = None
    songs_practiced: int | None = None
    sessions_count: int | None = None
