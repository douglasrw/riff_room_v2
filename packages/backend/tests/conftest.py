"""Pytest configuration and fixtures."""

import sys
from unittest.mock import MagicMock

# Mock demucs.api module before any imports that use it
# This allows tests to run without requiring the full demucs API
# (which doesn't exist in demucs 4.0.1)
sys.modules["demucs.api"] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.database import get_session
from app.main import app


@pytest.fixture(name="test_db_session")
def test_db_session_fixture():
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
def client_fixture(test_db_session: Session):
    """Create FastAPI test client with test database."""

    def get_session_override():
        return test_db_session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
