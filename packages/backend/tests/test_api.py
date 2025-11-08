"""Tests for API endpoints."""

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """Create FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "degraded", "unhealthy"]
    assert "timestamp" in data
    assert "checks" in data
    assert "version" in data


def test_process_no_file(client):
    """Test /api/process with no file."""
    response = client.post("/api/process")

    assert response.status_code == 422  # Validation error


def test_process_invalid_file_type(client):
    """Test /api/process with invalid file type."""
    # Create fake PDF file
    files = {"file": ("test.pdf", b"fake pdf", "application/pdf")}

    response = client.post("/api/process", files=files)

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_process_file_too_large(client):
    """Test /api/process with file exceeding size limit."""
    # Create file larger than 100MB limit
    large_data = b"x" * (101 * 1024 * 1024)  # 101MB
    files = {"file": ("large.mp3", large_data, "audio/mpeg")}

    response = client.post("/api/process", files=files)

    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]


@pytest.mark.integration
@pytest.mark.slow
def test_process_valid_file(client, tmp_path):
    """Test /api/process with valid audio file.

    Note: This is an integration test that requires actual audio file.
    Marked as slow to skip in quick test runs.
    """
    # This would require a real audio file to test properly
    # For now, we'll skip unless we have test fixtures
    pytest.skip("Requires test audio file fixture")


def test_get_stems_not_implemented(client):
    """Test /api/stems endpoint (currently returns 501)."""
    response = client.get("/api/stems/test-client-id")

    assert response.status_code == 501
    assert "WebSocket" in response.json()["detail"]
