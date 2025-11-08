"""API routes for streak tracking, sessions, and achievements."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    Achievement,
    AchievementCreate,
    Session as PracticeSession,
    SessionCreate,
    Streak,
    StreakCreate,
    StreakUpdate,
)

router = APIRouter()


# === Session Endpoints ===


@router.post("/sessions", response_model=PracticeSession, status_code=201)
def create_session(
    *,
    session_data: SessionCreate,
    db: Annotated[Session, Depends(get_session)],
) -> PracticeSession:
    """Record a new practice session."""
    # Create session from input data
    db_session = PracticeSession(**session_data.model_dump())

    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    return db_session


@router.get("/sessions", response_model=list[PracticeSession])
def list_sessions(
    *,
    db: Annotated[Session, Depends(get_session)],
    song_id: int | None = None,
    limit: int = 100,
) -> list[PracticeSession]:
    """List practice sessions with optional filters."""
    query = select(PracticeSession).order_by(PracticeSession.started_at.desc())

    if song_id is not None:
        query = query.where(PracticeSession.song_id == song_id)

    query = query.limit(limit)

    sessions = db.exec(query).all()
    return list(sessions)


# === Streak Endpoints ===


@router.get("/streaks", response_model=list[Streak])
def list_streaks(
    *,
    db: Annotated[Session, Depends(get_session)],
    since: date | None = None,
    limit: int = 365,
) -> list[Streak]:
    """List streak records with optional date filter."""
    query = select(Streak).order_by(Streak.date.desc())

    if since is not None:
        query = query.where(Streak.date >= since)

    query = query.limit(limit)

    streaks = db.exec(query).all()
    return list(streaks)


@router.get("/streaks/{streak_date}", response_model=Streak)
def get_streak(
    *,
    db: Annotated[Session, Depends(get_session)],
    streak_date: date,
) -> Streak:
    """Get streak record for a specific date (auto-creates if missing)."""
    streak = db.get(Streak, streak_date)
    if not streak:
        # Auto-create with defaults
        streak = Streak(date=streak_date)
        db.add(streak)
        db.commit()
        db.refresh(streak)
    return streak


@router.patch("/streaks/{streak_date}", response_model=Streak)
def update_streak(
    *,
    db: Annotated[Session, Depends(get_session)],
    streak_date: date,
    streak_update: StreakUpdate,
) -> Streak:
    """Update or create streak record for a specific date.

    FIXED: Added validation and atomic update to prevent race conditions.
    """
    # Input validation
    if streak_update.practice_time_seconds is not None:
        if streak_update.practice_time_seconds < 0:
            raise HTTPException(
                status_code=400,
                detail="practice_time_seconds must be non-negative"
            )

    # FIXED: Use BEGIN IMMEDIATE for write intent (prevents other writers)
    # SQLite WAL mode allows concurrent reads but only one writer
    db.execute("BEGIN IMMEDIATE")

    try:
        # Get existing streak or create new one
        streak = db.get(Streak, streak_date)

        if not streak:
            # Create new streak record with initial values
            streak = Streak(
                date=streak_date,
                practice_time_seconds=streak_update.practice_time_seconds or 0,
                songs_practiced=streak_update.songs_practiced or [],
                session_count=1,
            )
            db.add(streak)
        else:
            # Update existing streak (increment rather than replace)
            if streak_update.practice_time_seconds is not None:
                streak.practice_time_seconds += streak_update.practice_time_seconds

            if streak_update.songs_practiced is not None:
                # Merge song lists and deduplicate
                existing_songs = set(streak.songs_practiced)
                new_songs = set(streak_update.songs_practiced)
                streak.songs_practiced = list(existing_songs | new_songs)

            # Increment session count
            streak.session_count += 1

        db.commit()
        db.refresh(streak)

        return streak

    except Exception:
        db.rollback()
        raise


# === Achievement Endpoints ===


@router.get("/achievements", response_model=list[Achievement])
def list_achievements(
    *,
    db: Annotated[Session, Depends(get_session)],
) -> list[Achievement]:
    """List all unlocked achievements."""
    query = select(Achievement).order_by(Achievement.achieved_at.desc())
    achievements = db.exec(query).all()
    return list(achievements)


@router.post("/achievements", response_model=Achievement, status_code=201)
def create_achievement(
    *,
    db: Annotated[Session, Depends(get_session)],
    achievement_data: AchievementCreate,
) -> Achievement:
    """Unlock a new achievement.

    FIXED: Use database unique constraint to prevent race conditions (TOCTOU bug).
    Returns 409 if achievement already exists.
    """
    try:
        # FIXED: Use BEGIN IMMEDIATE to prevent race condition
        db.execute("BEGIN IMMEDIATE")

        # Check if achievement already exists
        existing = db.exec(
            select(Achievement).where(
                Achievement.achievement_type == achievement_data.achievement_type
            )
        ).first()

        if existing:
            raise HTTPException(
                status_code=409, detail="Achievement already unlocked"
            )

        # Create new achievement
        achievement = Achievement(**achievement_data.model_dump())

        db.add(achievement)
        db.commit()
        db.refresh(achievement)

        return achievement

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        # If unique constraint violation (shouldn't happen with locking, but defensive)
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=409, detail="Achievement already unlocked"
            ) from e
        raise


@router.get("/achievements/{achievement_id}", response_model=Achievement)
def get_achievement(
    *,
    db: Annotated[Session, Depends(get_session)],
    achievement_id: int,
) -> Achievement:
    """Get a specific achievement by ID."""
    achievement = db.get(Achievement, achievement_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    return achievement
