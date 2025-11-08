"""Security middleware for FastAPI application."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses.

    Implements OWASP recommendations for security headers:
    - Content-Security-Policy: Prevent XSS and injection attacks
    - X-Frame-Options: Prevent clickjacking
    - X-Content-Type-Options: Prevent MIME-type sniffing
    - Strict-Transport-Security: Enforce HTTPS
    - X-XSS-Protection: Legacy XSS protection
    - Referrer-Policy: Control referrer information
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        """Add security headers to response."""
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Legacy XSS protection (modern browsers use CSP)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy
        # Allow self for scripts/styles, data: for audio visualizations
        # Unsafe-inline needed for React inline styles (Tailwind)
        # Unsafe-eval needed for Tone.js audio processing
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "media-src 'self' blob:",
            "connect-src 'self' ws: wss:",
            "font-src 'self' data:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # HSTS - enforce HTTPS for 1 year
        # Only add in production with HTTPS
        # response.headers["Strict-Transport-Security"] = (
        #     "max-age=31536000; includeSubDomains"
        # )

        return response
