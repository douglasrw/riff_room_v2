"""Tests for cache manager."""

import tempfile
from pathlib import Path

import pytest

from app.services.cache_manager import CacheManager, get_cache_manager


@pytest.fixture
def temp_cache_dir():
    """Create temporary cache directory for tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def cache_manager(temp_cache_dir):
    """Create cache manager instance for testing."""
    return CacheManager(temp_cache_dir, max_size_mb=10)


def test_cache_manager_init(temp_cache_dir):
    """Test cache manager initialization."""
    manager = CacheManager(temp_cache_dir, max_size_mb=100)

    assert manager.cache_dir == temp_cache_dir
    assert manager.max_size_bytes == 100 * 1024 * 1024
    assert temp_cache_dir.exists()


def test_get_cache_key(cache_manager, tmp_path):
    """Test cache key generation from file hash."""
    # Create test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")

    # Get cache key
    key1 = cache_manager.get_cache_key(test_file)

    # Key should be 16 characters (first 16 of SHA256)
    assert len(key1) == 16
    assert isinstance(key1, str)

    # Same file should produce same key
    key2 = cache_manager.get_cache_key(test_file)
    assert key1 == key2

    # Different content should produce different key
    test_file.write_text("different content")
    key3 = cache_manager.get_cache_key(test_file)
    assert key1 != key3


def test_cache_exists(cache_manager, temp_cache_dir):
    """Test cache existence check."""
    cache_key = "test_key_123"

    # Should not exist initially
    assert not cache_manager.exists(cache_key)

    # Create cache directory
    (temp_cache_dir / cache_key).mkdir()

    # Should exist now
    assert cache_manager.exists(cache_key)


def test_cache_set_and_get(cache_manager, temp_cache_dir, tmp_path):
    """Test storing and retrieving cache."""
    cache_key = "test_song_456"

    # Create test stems directory
    stems_dir = tmp_path / "stems"
    stems_dir.mkdir()
    (stems_dir / "drums.wav").write_bytes(b"drums data")
    (stems_dir / "bass.wav").write_bytes(b"bass data")

    # Store in cache
    cached_path = cache_manager.set(cache_key, stems_dir)

    assert cached_path == temp_cache_dir / cache_key
    assert cached_path.exists()
    assert (cached_path / "drums.wav").exists()
    assert (cached_path / "bass.wav").exists()

    # Retrieve from cache
    retrieved_path = cache_manager.get(cache_key)

    assert retrieved_path == cached_path
    assert retrieved_path is not None


def test_cache_remove(cache_manager, temp_cache_dir, tmp_path):
    """Test cache removal."""
    cache_key = "test_key_789"

    # Create test stems
    stems_dir = tmp_path / "stems"
    stems_dir.mkdir()
    (stems_dir / "test.wav").write_bytes(b"data")

    # Add to cache
    cache_manager.set(cache_key, stems_dir)
    assert cache_manager.exists(cache_key)

    # Remove
    removed = cache_manager.remove(cache_key)

    assert removed is True
    assert not cache_manager.exists(cache_key)

    # Try removing again (should return False)
    removed_again = cache_manager.remove(cache_key)
    assert removed_again is False


def test_cache_clear(cache_manager, temp_cache_dir, tmp_path):
    """Test clearing all cache entries."""
    # Add multiple cache entries
    for i in range(3):
        stems_dir = tmp_path / f"stems_{i}"
        stems_dir.mkdir()
        (stems_dir / "test.wav").write_bytes(b"data")
        cache_manager.set(f"key_{i}", stems_dir)

    # Clear all
    count = cache_manager.clear()

    assert count == 3
    assert len(list(temp_cache_dir.iterdir())) == 0


def test_cache_stats(cache_manager, temp_cache_dir, tmp_path):
    """Test cache statistics."""
    # Initially empty
    stats = cache_manager.get_stats()

    assert stats["entry_count"] == 0
    assert stats["total_size_bytes"] == 0

    # Add some entries
    stems_dir = tmp_path / "stems"
    stems_dir.mkdir()
    (stems_dir / "test.wav").write_bytes(b"x" * 1000)  # 1KB file

    cache_manager.set("test", stems_dir)

    # Check stats
    stats = cache_manager.get_stats()

    assert stats["entry_count"] == 1
    assert stats["total_size_bytes"] == 1000
    assert stats["total_size_mb"] > 0


def test_get_cache_manager_singleton():
    """Test singleton cache manager."""
    manager1 = get_cache_manager()
    manager2 = get_cache_manager()

    # Should return same instance
    assert manager1 is manager2
