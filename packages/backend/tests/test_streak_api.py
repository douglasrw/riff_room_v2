"""Tests for streak tracking API endpoints."""

from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app


@pytest.fixture(name="session")
def session_fixture():
    """Create in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create FastAPI test client with test database."""

    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ========================================
# Session Tests
# ========================================


def test_create_session_minimal(client):
    """Test creating practice session with minimal data."""
    session_data = {
        "duration_seconds": 1800,  # 30 minutes
    }

    response = client.post("/api/sessions", json=session_data)

    assert response.status_code == 200
    data = response.json()
    assert data["duration_seconds"] == 1800
    assert data["song_id"] is None
    assert data["loop_start_time"] is None
    assert data["loop_end_time"] is None
    assert "id" in data
    assert "timestamp" in data


def test_create_session_full(client):
    """Test creating practice session with all fields."""
    session_data = {
        "duration_seconds": 3600,
        "song_id": "test-song-123",
        "loop_start_time": 30.5,
        "loop_end_time": 45.8,
        "stems_used": ["drums", "bass"],
        "notes": "Practiced bridge section",
    }

    response = client.post("/api/sessions", json=session_data)

    assert response.status_code == 200
    data = response.json()
    assert data["duration_seconds"] == 3600
    assert data["song_id"] == "test-song-123"
    assert data["loop_start_time"] == 30.5
    assert data["loop_end_time"] == 45.8
    assert data["stems_used"] == ["drums", "bass"]
    assert data["notes"] == "Practiced bridge section"


def test_create_session_invalid_duration(client):
    """Test creating session with negative duration."""
    session_data = {
        "duration_seconds": -100,
    }

    response = client.post("/api/sessions", json=session_data)

    assert response.status_code == 422  # Validation error


def test_get_sessions_empty(client):
    """Test getting sessions when none exist."""
    response = client.get("/api/sessions")

    assert response.status_code == 200
    assert response.json() == []


def test_get_sessions_list(client):
    """Test getting list of sessions."""
    # Create 3 sessions
    for i in range(3):
        client.post(
            "/api/sessions",
            json={"duration_seconds": 600 + i * 100},
        )

    response = client.get("/api/sessions")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # Should be in reverse chronological order (newest first)
    assert data[0]["duration_seconds"] == 800
    assert data[1]["duration_seconds"] == 700
    assert data[2]["duration_seconds"] == 600


def test_get_sessions_filter_by_song(client):
    """Test filtering sessions by song_id."""
    # Create sessions for different songs
    client.post("/api/sessions", json={"duration_seconds": 600, "song_id": "song-A"})
    client.post("/api/sessions", json={"duration_seconds": 700, "song_id": "song-B"})
    client.post("/api/sessions", json={"duration_seconds": 800, "song_id": "song-A"})

    response = client.get("/api/sessions?song_id=song-A")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all(s["song_id"] == "song-A" for s in data)


def test_get_sessions_limit(client):
    """Test limit parameter for sessions."""
    # Create 5 sessions
    for i in range(5):
        client.post("/api/sessions", json={"duration_seconds": 600})

    response = client.get("/api/sessions?limit=3")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


# ========================================
# Streak Tests
# ========================================


def test_get_streaks_empty(client):
    """Test getting streaks when none exist."""
    response = client.get("/api/streaks")

    assert response.status_code == 200
    assert response.json() == []


def test_get_streak_single_day(client):
    """Test getting streak for specific day."""
    today = date.today()
    response = client.get(f"/api/streaks/{today}")

    assert response.status_code == 200
    data = response.json()
    assert data["date"] == str(today)
    assert data["practice_time_seconds"] == 0
    assert data["session_count"] == 0
    assert data["songs_practiced"] == []


def test_update_streak_create_new(client):
    """Test updating streak creates new entry."""
    today = date.today()
    update_data = {
        "practice_time_seconds": 1800,
        "songs_practiced": ["song-1", "song-2"],
    }

    response = client.patch(f"/api/streaks/{today}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["date"] == str(today)
    assert data["practice_time_seconds"] == 1800
    assert data["session_count"] == 1
    assert set(data["songs_practiced"]) == {"song-1", "song-2"}


def test_update_streak_incremental(client):
    """Test updating streak increments values."""
    today = date.today()

    # First update
    client.patch(
        f"/api/streaks/{today}",
        json={
            "practice_time_seconds": 1800,
            "songs_practiced": ["song-1"],
        },
    )

    # Second update (should add to existing)
    response = client.patch(
        f"/api/streaks/{today}",
        json={
            "practice_time_seconds": 1200,
            "songs_practiced": ["song-2"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["practice_time_seconds"] == 3000  # 1800 + 1200
    assert data["session_count"] == 2  # Incremented twice
    assert set(data["songs_practiced"]) == {"song-1", "song-2"}


def test_update_streak_duplicate_songs(client):
    """Test updating streak deduplicates songs."""
    today = date.today()

    client.patch(
        f"/api/streaks/{today}",
        json={"songs_practiced": ["song-1", "song-2"]},
    )

    response = client.patch(
        f"/api/streaks/{today}",
        json={"songs_practiced": ["song-2", "song-3"]},
    )

    assert response.status_code == 200
    data = response.json()
    # Should have unique songs only
    assert set(data["songs_practiced"]) == {"song-1", "song-2", "song-3"}


def test_get_streaks_list(client):
    """Test getting list of streaks."""
    today = date.today()

    # Create streaks for last 3 days
    for i in range(3):
        day = today - timedelta(days=i)
        client.patch(
            f"/api/streaks/{day}",
            json={"practice_time_seconds": 1800},
        )

    response = client.get("/api/streaks")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # Should be in reverse chronological order
    assert data[0]["date"] == str(today)
    assert data[1]["date"] == str(today - timedelta(days=1))
    assert data[2]["date"] == str(today - timedelta(days=2))


def test_get_streaks_since_date(client):
    """Test filtering streaks by date."""
    today = date.today()

    # Create streaks for last 5 days
    for i in range(5):
        day = today - timedelta(days=i)
        client.patch(
            f"/api/streaks/{day}",
            json={"practice_time_seconds": 1800},
        )

    # Get only last 3 days
    since_date = today - timedelta(days=2)
    response = client.get(f"/api/streaks?since={since_date}")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


def test_get_streaks_limit(client):
    """Test limit parameter for streaks."""
    today = date.today()

    # Create 5 days of streaks
    for i in range(5):
        day = today - timedelta(days=i)
        client.patch(
            f"/api/streaks/{day}",
            json={"practice_time_seconds": 1800},
        )

    response = client.get("/api/streaks?limit=3")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


# ========================================
# Achievement Tests
# ========================================


def test_get_achievements_empty(client):
    """Test getting achievements when none exist."""
    response = client.get("/api/achievements")

    assert response.status_code == 200
    assert response.json() == []


def test_unlock_achievement(client):
    """Test unlocking achievement."""
    achievement_data = {
        "key": "first_song",
        "name": "First Song",
        "description": "Practiced your first song",
    }

    response = client.post("/api/achievements", json=achievement_data)

    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "first_song"
    assert data["name"] == "First Song"
    assert data["description"] == "Practiced your first song"
    assert "unlocked_at" in data


def test_unlock_achievement_duplicate(client):
    """Test unlocking same achievement twice."""
    achievement_data = {
        "key": "first_song",
        "name": "First Song",
    }

    # Unlock first time
    response1 = client.post("/api/achievements", json=achievement_data)
    assert response1.status_code == 200

    # Try to unlock again
    response2 = client.post("/api/achievements", json=achievement_data)
    assert response2.status_code == 400
    assert "already unlocked" in response2.json()["detail"]


def test_get_achievements_list(client):
    """Test getting list of unlocked achievements."""
    # Unlock 3 achievements
    achievements = [
        {"key": "first_song", "name": "First Song"},
        {"key": "week_streak", "name": "Week Streak"},
        {"key": "ten_hours", "name": "10 Hours"},
    ]

    for ach in achievements:
        client.post("/api/achievements", json=ach)

    response = client.get("/api/achievements")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    keys = {a["key"] for a in data}
    assert keys == {"first_song", "week_streak", "ten_hours"}


# ========================================
# Integration Tests
# ========================================


@pytest.mark.integration
def test_practice_workflow(client):
    """Test complete practice workflow: session → streak update → achievement."""
    today = date.today()

    # 1. Record practice session
    session_response = client.post(
        "/api/sessions",
        json={
            "duration_seconds": 1800,
            "song_id": "test-song",
        },
    )
    assert session_response.status_code == 200

    # 2. Update streak for today
    streak_response = client.patch(
        f"/api/streaks/{today}",
        json={
            "practice_time_seconds": 1800,
            "songs_practiced": ["test-song"],
        },
    )
    assert streak_response.status_code == 200
    streak = streak_response.json()
    assert streak["practice_time_seconds"] == 1800
    assert streak["session_count"] == 1

    # 3. Unlock achievement
    achievement_response = client.post(
        "/api/achievements",
        json={
            "key": "first_practice",
            "name": "First Practice",
        },
    )
    assert achievement_response.status_code == 200

    # 4. Verify all data is persisted
    sessions = client.get("/api/sessions").json()
    assert len(sessions) == 1

    streaks = client.get("/api/streaks").json()
    assert len(streaks) == 1

    achievements = client.get("/api/achievements").json()
    assert len(achievements) == 1


@pytest.mark.integration
def test_multi_day_streak(client):
    """Test practice streak across multiple days."""
    today = date.today()

    # Practice for 7 consecutive days
    for i in range(7):
        day = today - timedelta(days=i)
        client.patch(
            f"/api/streaks/{day}",
            json={
                "practice_time_seconds": 1800,
                "songs_practiced": [f"song-{i}"],
            },
        )

    # Get all streaks
    response = client.get("/api/streaks?limit=10")
    assert response.status_code == 200

    streaks = response.json()
    assert len(streaks) == 7

    # Each day should have 30 minutes
    for streak in streaks:
        assert streak["practice_time_seconds"] == 1800
        assert streak["session_count"] == 1
