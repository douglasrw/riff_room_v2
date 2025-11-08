"""Practice streak database models."""

from __future__ import annotations

from datetime import date as Date

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Streak(SQLModel, table=True):
    """Daily practice streak model."""

    __tablename__ = "streaks"  # type: ignore[assignment]

    date: Date = Field(primary_key=True)
    practice_time_seconds: int = Field(default=0)
    songs_practiced: list[str] = Field(
        default_factory=list, sa_column=Column(JSON)
    )
    session_count: int = Field(default=0)


class StreakCreate(SQLModel):
    """Schema for creating a new streak record."""

    date: Date
    practice_time_seconds: int = 0
    songs_practiced: list[str] = []
    session_count: int = 0


class StreakUpdate(SQLModel):
    """Schema for updating a streak record."""

    practice_time_seconds: int | None = None
    songs_practiced: list[str] | None = None
