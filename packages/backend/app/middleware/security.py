"""Security middleware for FastAPI application.

Provides:
- Content Security Policy headers
- Additional security headers (X-Frame-Options, etc.)
- Request logging
"""

from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # Content Security Policy
        # Allows self-hosted resources, inline styles (for Tailwind),
        # and WebSocket connections
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",  # unsafe-inline needed for Vite dev
            "style-src 'self' 'unsafe-inline'",  # unsafe-inline for Tailwind
            "connect-src 'self' ws: wss:",  # WebSocket support
            "img-src 'self' data: blob:",  # data URIs for waveform canvas
            "font-src 'self'",
            "frame-ancestors 'none'",  # Prevent clickjacking
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # XSS protection (legacy, but doesn't hurt)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (restrict features)
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "camera=(), "
            "microphone=(), "
            "payment=()"
        )

        return response
