"""
Multi-layer cache manager for processed audio stems.

Provides SHA256 hash-based caching with automatic cleanup
and offline support.
"""

import hashlib
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


class CacheManager:
    """Manages multi-layer caching for processed stems."""

    def __init__(self, cache_dir: Path, max_size_mb: int = 1000):
        """
        Initialize cache manager.

        Args:
            cache_dir: Base directory for cache storage
            max_size_mb: Maximum cache size in megabytes
        """
        self.cache_dir = cache_dir
        self.max_size_bytes = max_size_mb * 1024 * 1024

        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def get_cache_key(self, file_path: Path) -> str:
        """
        Generate SHA256 hash cache key for file.

        Args:
            file_path: Path to file to hash

        Returns:
            Hex digest of file hash
        """
        sha256_hash = hashlib.sha256()

        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)

        return sha256_hash.hexdigest()[:16]  # Use first 16 chars

    def get(self, cache_key: str) -> Path | None:
        """
        Get cached stems directory for given key.

        Args:
            cache_key: Cache key (from get_cache_key)

        Returns:
            Path to cached stems directory, or None if not found
        """
        cache_path = self.cache_dir / cache_key

        if not cache_path.exists():
            return None

        # Update access time
        self._touch_cache(cache_path)

        return cache_path

    def set(self, cache_key: str, stems_dir: Path) -> Path:
        """
        Store stems in cache.

        Args:
            cache_key: Cache key
            stems_dir: Directory containing stem files to cache

        Returns:
            Path to cached stems directory
        """
        cache_path = self.cache_dir / cache_key

        # Remove existing cache if present
        if cache_path.exists():
            shutil.rmtree(cache_path)

        # Copy stems to cache
        shutil.copytree(stems_dir, cache_path)

        # Check and enforce cache size limit
        self._enforce_size_limit()

        return cache_path

    def exists(self, cache_key: str) -> bool:
        """
        Check if cache entry exists.

        Args:
            cache_key: Cache key to check

        Returns:
            True if cache entry exists
        """
        return (self.cache_dir / cache_key).exists()

    def remove(self, cache_key: str) -> bool:
        """
        Remove cache entry.

        Args:
            cache_key: Cache key to remove

        Returns:
            True if entry was removed
        """
        cache_path = self.cache_dir / cache_key

        if cache_path.exists():
            shutil.rmtree(cache_path)
            return True

        return False

    def clear(self) -> int:
        """
        Clear all cache entries.

        Returns:
            Number of entries cleared
        """
        count = 0

        for cache_dir in self.cache_dir.iterdir():
            if cache_dir.is_dir():
                shutil.rmtree(cache_dir)
                count += 1

        return count

    def cleanup_old(self, max_age_days: int = 30) -> int:
        """
        Remove cache entries older than specified age.

        Args:
            max_age_days: Maximum age in days (default 30)

        Returns:
            Number of entries removed
        """
        cutoff = datetime.now() - timedelta(days=max_age_days)
        count = 0

        for cache_dir in self.cache_dir.iterdir():
            if not cache_dir.is_dir():
                continue

            # Check modification time
            mtime = datetime.fromtimestamp(cache_dir.stat().st_mtime)

            if mtime < cutoff:
                shutil.rmtree(cache_dir)
                count += 1

        return count

    def get_stats(self) -> dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache stats (size, entries, etc.)
        """
        total_size = 0
        entry_count = 0
        oldest_entry = None
        newest_entry = None

        for cache_dir in self.cache_dir.iterdir():
            if not cache_dir.is_dir():
                continue

            entry_count += 1

            # Calculate directory size
            dir_size = sum(
                f.stat().st_size for f in cache_dir.rglob("*") if f.is_file()
            )
            total_size += dir_size

            # Track oldest/newest
            mtime = datetime.fromtimestamp(cache_dir.stat().st_mtime)

            if oldest_entry is None or mtime < oldest_entry:
                oldest_entry = mtime

            if newest_entry is None or mtime > newest_entry:
                newest_entry = mtime

        return {
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "total_size_bytes": total_size,
            "entry_count": entry_count,
            "max_size_mb": self.max_size_bytes / (1024 * 1024),
            "usage_percent": round(
                (total_size / self.max_size_bytes * 100), 2
            )
            if self.max_size_bytes > 0
            else 0,
            "oldest_entry": oldest_entry.isoformat() if oldest_entry else None,
            "newest_entry": newest_entry.isoformat() if newest_entry else None,
        }

    def _enforce_size_limit(self) -> None:
        """
        Enforce cache size limit by removing oldest entries.

        Uses LRU (Least Recently Used) eviction strategy.
        """
        stats = self.get_stats()

        if stats["total_size_bytes"] <= self.max_size_bytes:
            return

        # Get all cache directories sorted by access time (oldest first)
        cache_dirs = [
            (d, d.stat().st_atime)
            for d in self.cache_dir.iterdir()
            if d.is_dir()
        ]
        cache_dirs.sort(key=lambda x: x[1])

        # Remove oldest entries until under limit
        current_size = stats["total_size_bytes"]

        for cache_dir, _ in cache_dirs:
            if current_size <= self.max_size_bytes:
                break

            # Calculate dir size
            dir_size = sum(
                f.stat().st_size for f in cache_dir.rglob("*") if f.is_file()
            )

            # Remove directory
            shutil.rmtree(cache_dir)
            current_size -= dir_size

    def _touch_cache(self, cache_path: Path) -> None:
        """
        Update access time for cache entry (for LRU).

        Args:
            cache_path: Path to cache directory
        """
        # Touch directory to update access time
        cache_path.touch(exist_ok=True)


# Singleton instance
_cache_manager: CacheManager | None = None


def get_cache_manager(
    cache_dir: Path | None = None, max_size_mb: int = 1000
) -> CacheManager:
    """
    Get or create cache manager singleton.

    Args:
        cache_dir: Cache directory (only used on first call)
        max_size_mb: Max cache size in MB (only used on first call)

    Returns:
        CacheManager instance
    """
    global _cache_manager

    if _cache_manager is None:
        if cache_dir is None:
            from pathlib import Path

            cache_dir = Path.home() / ".riffroom" / "cache"

        _cache_manager = CacheManager(cache_dir, max_size_mb)

    return _cache_manager
