"""Tests for WebSocket connection handling."""
import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import WebSocketDisconnect

from app.api.websocket import ConnectionManager


class TestConnectionManager:
    """Test ConnectionManager functionality."""

    @pytest.fixture
    def manager(self) -> ConnectionManager:
        """Create a ConnectionManager instance."""
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self) -> Mock:
        """Create a mock WebSocket."""
        ws = Mock()
        ws.accept = AsyncMock()
        ws.send_json = AsyncMock()
        ws.close = AsyncMock()
        return ws

    @pytest.mark.asyncio
    async def test_connect_new_client(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test connecting a new client."""
        await manager.connect(mock_websocket, "client-1")

        assert "client-1" in manager.active_connections
        assert manager.active_connections["client-1"] == mock_websocket
        assert "client-1" in manager.connection_timestamps
        mock_websocket.accept.assert_called_once()

    @pytest.mark.asyncio
    async def test_disconnect_existing_client(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test disconnecting an existing client."""
        await manager.connect(mock_websocket, "client-2")
        await manager.disconnect("client-2")

        assert "client-2" not in manager.active_connections
        assert "client-2" not in manager.connection_timestamps

    @pytest.mark.asyncio
    async def test_disconnect_nonexistent_client(
        self, manager: ConnectionManager
    ) -> None:
        """Test disconnecting a client that doesn't exist."""
        # Should not raise error
        await manager.disconnect("nonexistent-client")
        assert "nonexistent-client" not in manager.active_connections

    @pytest.mark.asyncio
    async def test_send_progress_update(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test sending progress update to client."""
        await manager.connect(mock_websocket, "client-3")
        await manager.send_progress("client-3", 50.0, "processing")

        # Verify WebSocket message was sent
        mock_websocket.send_json.assert_called_once()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "progress"
        assert call_args["data"]["progress"] == 50.0
        assert call_args["data"]["status"] == "processing"

    @pytest.mark.asyncio
    async def test_send_progress_with_metadata(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test sending progress with metadata."""
        await manager.connect(mock_websocket, "client-meta")
        metadata = {"step": "separating vocals"}

        await manager.send_progress("client-meta", 75.0, "processing", metadata=metadata)

        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["data"]["metadata"] == metadata

    @pytest.mark.asyncio
    async def test_send_progress_to_nonexistent_client(
        self, manager: ConnectionManager
    ) -> None:
        """Test sending progress to disconnected client."""
        # Should not raise error
        await manager.send_progress("nonexistent-client", 50.0, "processing")

    @pytest.mark.asyncio
    async def test_send_error(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test sending error message to client."""
        await manager.connect(mock_websocket, "client-4")
        await manager.send_error("client-4", "Processing failed")

        # Verify WebSocket message was sent
        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "error"
        assert call_args["data"]["error"] == "Processing failed"

    @pytest.mark.asyncio
    async def test_send_error_with_details(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test sending error with details."""
        await manager.connect(mock_websocket, "client-err")
        details = {"code": "AUDIO_INVALID", "filename": "test.wav"}

        await manager.send_error("client-err", "Invalid audio file", details=details)

        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["data"]["details"] == details

    @pytest.mark.asyncio
    async def test_send_completion(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test sending completion message with result."""
        await manager.connect(mock_websocket, "client-5")
        result = {
            "stems": {
                "vocals": "/path/vocals.wav",
                "drums": "/path/drums.wav",
                "bass": "/path/bass.wav",
                "other": "/path/other.wav",
            }
        }

        await manager.send_completion("client-5", result)

        # Verify WebSocket message was sent
        mock_websocket.send_json.assert_called()
        call_args = mock_websocket.send_json.call_args[0][0]
        assert call_args["type"] == "complete"
        assert call_args["data"] == result

    @pytest.mark.asyncio
    async def test_broadcast_to_all_clients(self, manager: ConnectionManager) -> None:
        """Test broadcasting message to all connected clients."""
        ws1 = Mock()
        ws1.accept = AsyncMock()
        ws1.send_json = AsyncMock()

        ws2 = Mock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()

        await manager.connect(ws1, "client-a")
        await manager.connect(ws2, "client-b")

        message = {"type": "announcement", "data": {"text": "Server restarting"}}
        await manager.broadcast(message)

        # Both clients should receive the broadcast
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_removes_failed_connections(
        self, manager: ConnectionManager
    ) -> None:
        """Test that broadcast removes clients with failed sends."""
        ws1 = Mock()
        ws1.accept = AsyncMock()
        ws1.send_json = AsyncMock(side_effect=Exception("Connection lost"))

        ws2 = Mock()
        ws2.accept = AsyncMock()
        ws2.send_json = AsyncMock()

        await manager.connect(ws1, "client-fail")
        await manager.connect(ws2, "client-ok")

        await manager.broadcast({"type": "test"})

        # Failed client should be disconnected
        assert "client-fail" not in manager.active_connections
        assert "client-ok" in manager.active_connections

    @pytest.mark.asyncio
    async def test_websocket_send_failure_disconnects(
        self, manager: ConnectionManager, mock_websocket: Mock
    ) -> None:
        """Test handling WebSocket send failure."""
        # Simulate send failure
        mock_websocket.send_json.side_effect = Exception("Connection lost")

        await manager.connect(mock_websocket, "client-fail")

        # Sending should disconnect the client
        await manager.send_progress("client-fail", 50.0, "processing")

        # Client should be auto-disconnected after failed send
        assert "client-fail" not in manager.active_connections


class TestWebSocketEndpoint:
    """Test WebSocket endpoint behavior."""

    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self) -> None:
        """Test WebSocket ping-pong health check."""
        from app.api.websocket import websocket_endpoint

        ws_mock = Mock()
        ws_mock.accept = AsyncMock()
        ws_mock.receive_json = AsyncMock(
            side_effect=[
                {"type": "ping"},  # First message: ping
                WebSocketDisconnect(code=1000),  # Then disconnect
            ]
        )
        ws_mock.send_json = AsyncMock()

        manager_mock = Mock()
        manager_mock.connect = AsyncMock()
        manager_mock.disconnect = AsyncMock()

        with patch("app.api.websocket.manager", manager_mock):
            await websocket_endpoint(ws_mock, "test-ping")

        # Should respond to ping with pong
        ws_mock.send_json.assert_called_with({"type": "pong"})

    @pytest.mark.asyncio
    async def test_websocket_handles_disconnect(self) -> None:
        """Test WebSocket disconnect handling."""
        from app.api.websocket import websocket_endpoint

        ws_mock = Mock()
        ws_mock.accept = AsyncMock()
        ws_mock.receive_json = AsyncMock(side_effect=WebSocketDisconnect(code=1000))

        manager_mock = Mock()
        manager_mock.connect = AsyncMock()
        manager_mock.disconnect = AsyncMock()

        with patch("app.api.websocket.manager", manager_mock):
            await websocket_endpoint(ws_mock, "test-disconnect")

        # Verify disconnect was called
        manager_mock.disconnect.assert_called_once_with("test-disconnect")

    @pytest.mark.asyncio
    async def test_websocket_handles_error(self) -> None:
        """Test WebSocket error handling."""
        from app.api.websocket import websocket_endpoint

        ws_mock = Mock()
        ws_mock.accept = AsyncMock()
        ws_mock.receive_json = AsyncMock(side_effect=RuntimeError("Test error"))

        manager_mock = Mock()
        manager_mock.connect = AsyncMock()
        manager_mock.disconnect = AsyncMock()

        with patch("app.api.websocket.manager", manager_mock):
            await websocket_endpoint(ws_mock, "test-error")

        # Should disconnect on error
        manager_mock.disconnect.assert_called_once_with("test-error")
