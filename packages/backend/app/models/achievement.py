"""Achievement database models."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)


class AchievementType(str, Enum):
    """Achievement types for milestones."""

    STREAK_7 = "streak_7"  # 7-day streak
    STREAK_30 = "streak_30"  # 30-day streak
    STREAK_100 = "streak_100"  # 100-day streak
    SONGS_10 = "songs_10"  # 10 songs practiced
    SONGS_50 = "songs_50"  # 50 songs practiced
    SONGS_100 = "songs_100"  # 100 songs practiced
    HOURS_10 = "hours_10"  # 10 hours total practice
    HOURS_50 = "hours_50"  # 50 hours total practice
    HOURS_100 = "hours_100"  # 100 hours total practice
    LOOPS_100 = "loops_100"  # 100 loops practiced
    LOOPS_500 = "loops_500"  # 500 loops practiced
    LOOPS_1000 = "loops_1000"  # 1000 loops practiced


class Achievement(SQLModel, table=True):
    """Achievement unlock model."""

    __tablename__ = "achievements"  # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    achievement_type: AchievementType = Field(index=True, unique=True)
    achieved_at: datetime = Field(default_factory=utc_now)
    details: str | None = Field(default=None)  # JSON with details


class AchievementCreate(SQLModel):
    """Schema for creating a new achievement."""

    achievement_type: AchievementType
    achieved_at: datetime | None = None
    details: str | None = None
