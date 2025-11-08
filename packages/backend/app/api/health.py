"""
Health check endpoint for monitoring and orchestration.

Provides comprehensive system status including:
- Demucs model availability
- Database connectivity
- Cache directory writability
- GPU/CPU availability
- System resources
"""

import os
import time
from pathlib import Path
from typing import Any

import torch
from decouple import config
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthStatus(BaseModel):
    """Health check response model."""

    status: str  # "healthy", "degraded", "unhealthy"
    timestamp: float
    checks: dict[str, Any]
    version: str = "0.1.0"


class CheckResult(BaseModel):
    """Individual health check result."""

    status: str  # "pass", "warn", "fail"
    message: str
    duration_ms: float
    details: dict[str, Any] | None = None


def check_demucs_model() -> CheckResult:
    """Verify Demucs model can be loaded."""
    start = time.time()

    try:
        # Check if torch is available
        if not torch.cuda.is_available() and not torch.backends.mps.is_available():
            # CPU only - this is fine but warn
            device = "cpu"
            message = "Demucs available (CPU only)"
            status = "warn"
        elif torch.cuda.is_available():
            device = "cuda"
            message = f"Demucs available (CUDA: {torch.cuda.get_device_name(0)})"
            status = "pass"
        elif torch.backends.mps.is_available():
            device = "mps"
            message = "Demucs available (Apple Silicon MPS)"
            status = "pass"
        else:
            device = "cpu"
            message = "Demucs available (CPU only)"
            status = "warn"

        duration_ms = (time.time() - start) * 1000

        return CheckResult(
            status=status,
            message=message,
            duration_ms=duration_ms,
            details={
                "device": device,
                "torch_version": torch.__version__,
                "cuda_available": torch.cuda.is_available(),
                "mps_available": torch.backends.mps.is_available(),
            },
        )

    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="fail",
            message=f"Demucs check failed: {str(e)}",
            duration_ms=duration_ms,
            details={"error": str(e)},
        )


def check_database() -> CheckResult:
    """Verify database connectivity and schema."""
    start = time.time()

    try:
        from app.database import engine

        # Try to connect
        with engine.connect() as conn:
            # Simple query to verify connection
            conn.execute("SELECT 1")

        duration_ms = (time.time() - start) * 1000

        # Check if database file exists
        db_path = Path.home() / ".riffroom" / "riffroom.db"
        db_exists = db_path.exists()

        return CheckResult(
            status="pass",
            message="Database connected",
            duration_ms=duration_ms,
            details={
                "database_path": str(db_path),
                "exists": db_exists,
                "size_bytes": db_path.stat().st_size if db_exists else 0,
            },
        )

    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="fail",
            message=f"Database check failed: {str(e)}",
            duration_ms=duration_ms,
            details={"error": str(e)},
        )


def check_cache_directory() -> CheckResult:
    """Verify cache directory exists and is writable."""
    start = time.time()

    try:
        cache_dir = Path(config("CACHE_DIR", default=str(Path.home() / ".riffroom" / "stems")))

        # Check if directory exists
        if not cache_dir.exists():
            cache_dir.mkdir(parents=True, exist_ok=True)

        # Test write access
        test_file = cache_dir / ".health_check"
        test_file.write_text("health_check")
        test_file.unlink()

        # Calculate directory size
        total_size = sum(f.stat().st_size for f in cache_dir.rglob("*") if f.is_file())
        file_count = len(list(cache_dir.rglob("*")))

        duration_ms = (time.time() - start) * 1000

        return CheckResult(
            status="pass",
            message="Cache directory writable",
            duration_ms=duration_ms,
            details={
                "path": str(cache_dir),
                "total_size_bytes": total_size,
                "file_count": file_count,
                "writable": True,
            },
        )

    except PermissionError as e:
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="fail",
            message="Cache directory not writable",
            duration_ms=duration_ms,
            details={"error": str(e), "path": str(cache_dir)},
        )

    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="fail",
            message=f"Cache directory check failed: {str(e)}",
            duration_ms=duration_ms,
            details={"error": str(e)},
        )


def check_system_resources() -> CheckResult:
    """Check CPU/GPU availability and system resources."""
    start = time.time()

    try:
        import psutil

        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()

        details: dict[str, Any] = {
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": cpu_percent,
            "memory_total_gb": round(memory.total / (1024**3), 2),
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "memory_percent": memory.percent,
        }

        # Check GPU if available
        if torch.cuda.is_available():
            details["gpu_count"] = torch.cuda.device_count()
            details["gpu_name"] = torch.cuda.get_device_name(0)
            details["gpu_memory_allocated_mb"] = round(
                torch.cuda.memory_allocated(0) / (1024**2), 2
            )
            details["gpu_memory_reserved_mb"] = round(
                torch.cuda.memory_reserved(0) / (1024**2), 2
            )

        # Determine status based on resource availability
        if memory.percent > 90:
            status = "warn"
            message = "High memory usage"
        elif cpu_percent > 90:
            status = "warn"
            message = "High CPU usage"
        else:
            status = "pass"
            message = "System resources OK"

        duration_ms = (time.time() - start) * 1000

        return CheckResult(
            status=status, message=message, duration_ms=duration_ms, details=details
        )

    except ImportError:
        # psutil not available (optional dependency)
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="warn",
            message="System resource monitoring unavailable (psutil not installed)",
            duration_ms=duration_ms,
            details={},
        )

    except Exception as e:
        duration_ms = (time.time() - start) * 1000
        return CheckResult(
            status="warn",
            message=f"System resource check failed: {str(e)}",
            duration_ms=duration_ms,
            details={"error": str(e)},
        )


@router.get("/health", response_model=HealthStatus)
async def health_check() -> HealthStatus:
    """
    Comprehensive health check endpoint.

    Returns detailed system status including:
    - Demucs model availability and device (CPU/GPU/MPS)
    - Database connectivity and size
    - Cache directory writability and usage
    - System resources (CPU, memory, GPU)

    Status codes:
    - 200: healthy (all checks pass)
    - 200: degraded (some checks warn)
    - 503: unhealthy (any check fails) - handled by status_code parameter

    Use for:
    - Container orchestration health probes
    - Load balancer health checks
    - Monitoring and alerting
    - Development debugging
    """
    start_time = time.time()

    # Run all checks
    checks = {
        "demucs": check_demucs_model(),
        "database": check_database(),
        "cache": check_cache_directory(),
        "system": check_system_resources(),
    }

    # Determine overall status
    has_failures = any(check.status == "fail" for check in checks.values())
    has_warnings = any(check.status == "warn" for check in checks.values())

    if has_failures:
        overall_status = "unhealthy"
    elif has_warnings:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return HealthStatus(
        status=overall_status,
        timestamp=start_time,
        checks={name: check.model_dump() for name, check in checks.items()},
    )


@router.get("/health/live")
async def liveness_check() -> dict[str, str]:
    """
    Lightweight liveness check for Kubernetes/container orchestration.

    Returns 200 if the service is running, regardless of component health.
    Use for liveness probes (restart container if fails).
    """
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness_check() -> dict[str, Any]:
    """
    Readiness check for load balancing.

    Returns 200 only if service is ready to handle requests (Demucs available, cache writable).
    Use for readiness probes (remove from load balancer if fails).
    """
    demucs_check = check_demucs_model()
    cache_check = check_cache_directory()

    ready = demucs_check.status != "fail" and cache_check.status != "fail"

    return {
        "status": "ready" if ready else "not_ready",
        "demucs": demucs_check.status,
        "cache": cache_check.status,
    }
