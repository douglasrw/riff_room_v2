"""Middleware for FastAPI application."""

from app.middleware.security import SecurityHeadersMiddleware

__all__ = ["SecurityHeadersMiddleware"]
