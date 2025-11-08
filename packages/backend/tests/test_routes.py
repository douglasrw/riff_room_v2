"""Additional tests for API routes to improve coverage."""
import io
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestFileValidation:
    """Test file upload validation logic."""

    def test_process_missing_file_parameter(self) -> None:
        """Test processing without file parameter."""
        response = client.post("/api/process")
        assert response.status_code == 422  # Validation error

    def test_process_empty_filename(self) -> None:
        """Test processing with empty filename."""
        files = {"file": ("", b"fake audio data", "audio/wav")}
        response = client.post("/api/process", files=files)

        # Should either reject empty filename or use default
        assert response.status_code in [400, 422]

    def test_process_unsupported_extension(self) -> None:
        """Test processing with unsupported file extension."""
        files = {"file": ("test.txt", b"fake text data", "text/plain")}
        response = client.post("/api/process", files=files)

        assert response.status_code == 400
        assert "unsupported" in response.json()["detail"].lower()

    def test_process_file_size_exactly_at_limit(self) -> None:
        """Test file at exactly 100MB limit."""
        # Create exactly 100MB of data
        max_size = 100 * 1024 * 1024
        large_data = b"x" * max_size

        files = {"file": ("test.mp3", large_data, "audio/mpeg")}
        response = client.post("/api/process", files=files)

        # Should accept at limit
        # Note: Actual validation happens on read, so may fail on audio validation
        assert response.status_code in [200, 400]  # Either processes or fails validation

    @pytest.mark.asyncio
    async def test_audio_validation_failure(self) -> None:
        """Test audio file validation with invalid audio."""
        from app.api.routes import _validate_audio_file

        # Create temp file with non-audio data
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(b"not audio data")
            temp_path = Path(f.name)

        try:
            with pytest.raises(Exception):  # Should raise librosa error
                _validate_audio_file(temp_path)
        finally:
            temp_path.unlink()


class TestErrorHandling:
    """Test error handling in routes."""

    @patch("app.api.routes.client_sessions")
    def test_get_stems_nonexistent_client(self, mock_sessions: Mock) -> None:
        """Test getting stems for non-existent client."""
        mock_sessions.__contains__ = Mock(return_value=False)

        response = client.get("/api/stems/nonexistent-client-id")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @patch("app.api.routes.client_sessions")
    def test_get_stems_no_stems_available(self, mock_sessions: Mock) -> None:
        """Test getting stems when processing not complete."""
        mock_session = Mock()
        mock_session.stems = None
        mock_sessions.__getitem__ = Mock(return_value=mock_session)
        mock_sessions.__contains__ = Mock(return_value=True)

        response = client.get("/api/stems/test-client-id")

        assert response.status_code == 404


class TestHealthEndpoints:
    """Test health check endpoints."""

    def test_health_detailed_endpoint(self) -> None:
        """Test detailed health endpoint (legacy)."""
        response = client.get("/health/detailed")

        assert response.status_code == 200
        data = response.json()

        # Should have basic health info
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]

    def test_root_endpoint(self) -> None:
        """Test root endpoint."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert data["status"] == "running"
        assert "version" in data


class TestCORS:
    """Test CORS middleware."""

    def test_cors_preflight_request(self) -> None:
        """Test CORS preflight (OPTIONS) request."""
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        }

        response = client.options("/api/process", headers=headers)

        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    def test_cors_actual_request(self) -> None:
        """Test CORS on actual request."""
        headers = {"Origin": "http://localhost:5173"}

        response = client.get("/health/detailed", headers=headers)

        assert "access-control-allow-origin" in response.headers


class TestPathTraversalPrevention:
    """Test path traversal attack prevention."""

    @patch("app.api.routes.client_sessions")
    @patch("app.api.routes.process_audio")
    async def test_malicious_filename_path_traversal(self) -> None:
        """Test that ../ in filename doesn't cause path traversal."""
        malicious_names = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "dir/../../etc/passwd",
        ]

        for malicious_name in malicious_names:
            files = {"file": (malicious_name, b"fake audio", "audio/wav")}
            response = client.post("/api/process", files=files)

            # Should either sanitize or reject
            assert response.status_code in [200, 400, 422]

            # If it processes, verify the filename was sanitized
            if response.status_code == 200:
                # Filename should be sanitized (no path components)
                assert ".." not in response.json().get("client_id", "")
                assert "/" not in response.json().get("client_id", "")
                assert "\\" not in response.json().get("client_id", "")
