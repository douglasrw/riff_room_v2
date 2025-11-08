"""Achievement database models."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Get current UTC time as timezone-aware datetime."""
    return datetime.now(UTC)


# Achievement types for milestones
AchievementType = Literal[
    "streak_7",  # 7-day streak
    "streak_30",  # 30-day streak
    "streak_100",  # 100-day streak
    "songs_10",  # 10 songs practiced
    "songs_50",  # 50 songs practiced
    "songs_100",  # 100 songs practiced
    "hours_10",  # 10 hours total practice
    "hours_50",  # 50 hours total practice
    "hours_100",  # 100 hours total practice
    "loops_100",  # 100 loops practiced
    "loops_500",  # 500 loops practiced
    "loops_1000",  # 1000 loops practiced
]


class Achievement(SQLModel, table=True):
    """Achievement unlock model."""

    __tablename__ = "achievements"  # type: ignore[assignment]

    id: int | None = Field(default=None, primary_key=True)
    achievement_type: AchievementType = Field(index=True, unique=True)
    achieved_at: datetime = Field(default_factory=utc_now)
    metadata: str | None = Field(default=None)  # JSON with details


class AchievementCreate(SQLModel):
    """Schema for creating a new achievement."""

    achievement_type: AchievementType
    achieved_at: datetime | None = None
    metadata: str | None = None
