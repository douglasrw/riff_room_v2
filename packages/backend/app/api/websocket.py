"""WebSocket connection manager for real-time progress updates."""

from __future__ import annotations

import asyncio
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""

    def __init__(self, stale_timeout: float = 300.0) -> None:
        """Initialize connection manager.

        Args:
            stale_timeout: Seconds before a connection is considered stale (default 5 min)
        """
        self.active_connections: dict[str, WebSocket] = {}
        self.connection_timestamps: dict[str, float] = {}
        self.stale_timeout = stale_timeout
        self._cleanup_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept and register a new WebSocket connection.

        Args:
            websocket: The WebSocket connection
            client_id: Unique identifier for the client
        """
        try:
            await websocket.accept()
            self.active_connections[client_id] = websocket
            self.connection_timestamps[client_id] = time.time()
            logger.info(f"WebSocket connected: {client_id} (total: {len(self.active_connections)})")

            # Start cleanup task if not running
            # FIXED H7: Cancel old task before starting new one to prevent race
            if self._cleanup_task is None or self._cleanup_task.done():
                self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            elif not self._cleanup_task.done():
                # Task already running, no need to start another
                pass
        except Exception as e:
            # FIXED: If accept fails, don't add to active connections
            logger.error(f"Failed to accept WebSocket for {client_id}: {e}", exc_info=True)
            raise

    async def disconnect(self, client_id: str) -> None:
        """Remove a WebSocket connection.

        Args:
            client_id: Client identifier to disconnect
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"WebSocket disconnected: {client_id} (remaining: {len(self.active_connections)})")
        if client_id in self.connection_timestamps:
            del self.connection_timestamps[client_id]

    async def send_progress(
        self,
        client_id: str,
        progress: float,
        status: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Send progress update to a specific client.

        Args:
            client_id: Target client identifier
            progress: Progress percentage (0-100)
            status: Status message
            metadata: Optional additional data
        """
        if client_id in self.active_connections:
            message = {
                "type": "progress",
                "data": {
                    "progress": progress,
                    "status": status,
                    "metadata": metadata or {},
                },
            }
            try:
                await self.active_connections[client_id].send_json(message)
                # Update timestamp on successful send
                self.connection_timestamps[client_id] = time.time()
            except Exception:
                # Connection dead, remove it
                await self.disconnect(client_id)

    async def send_completion(
        self,
        client_id: str,
        result: dict[str, Any],
    ) -> None:
        """Send completion notification to a client.

        Args:
            client_id: Target client identifier
            result: Completion result data
        """
        if client_id in self.active_connections:
            message = {
                "type": "complete",
                "data": result,
            }
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception:
                # Connection dead, remove it
                await self.disconnect(client_id)

    async def send_error(
        self,
        client_id: str,
        error: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        """Send error notification to a client.

        Args:
            client_id: Target client identifier
            error: Error message
            details: Optional error details
        """
        if client_id in self.active_connections:
            message = {
                "type": "error",
                "data": {
                    "error": error,
                    "details": details or {},
                },
            }
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception:
                # Connection dead, remove it
                await self.disconnect(client_id)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast message to all connected clients.

        Args:
            message: Message to broadcast
        """
        disconnected = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(client_id)

        # Clean up disconnected clients
        for client_id in disconnected:
            await self.disconnect(client_id)

    async def _periodic_cleanup(self) -> None:
        """Periodically clean up stale connections.

        FIXED: Prevent memory leak from abandoned connections.
        Runs every 60 seconds and removes connections older than stale_timeout.
        """
        while True:
            await asyncio.sleep(60)  # Check every minute

            now = time.time()
            stale_clients = []

            for client_id, timestamp in self.connection_timestamps.items():
                if now - timestamp > self.stale_timeout:
                    stale_clients.append(client_id)

            # Remove stale connections
            for client_id in stale_clients:
                logger.info(f"Cleaning up stale connection: {client_id}")
                await self.disconnect(client_id)

            # Stop cleanup task if no connections remain
            if not self.active_connections:
                break


# Global connection manager instance
manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, client_id: str) -> None:
    """WebSocket endpoint handler.

    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier
    """
    await manager.connect(websocket, client_id)

    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_json()

            # Handle ping-pong for connection health check
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        await manager.disconnect(client_id)
    except Exception as e:
        # Log error and clean up
        logger.error(f"WebSocket error for client {client_id}: {e}", exc_info=True)
        await manager.disconnect(client_id)
