"""Demucs-based stem separation processor."""

from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path
from typing import TYPE_CHECKING

import torch
from demucs.api import Separator

from app.core.logging_config import get_logger

if TYPE_CHECKING:
    from collections.abc import Callable

logger = get_logger(__name__)


class ProcessingError(Exception):
    """Exception raised when stem separation fails."""


class CancellationError(Exception):
    """Exception raised when processing is cancelled."""


class DemucsProcessor:
    """Handle audio stem separation using Demucs ML model."""

    def __init__(self, cache_dir: Path, model_name: str = "htdemucs_ft") -> None:
        """Initialize Demucs processor.

        Args:
            cache_dir: Directory to cache processed stems
            model_name: Demucs model to use (default: htdemucs_ft)
        """
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Initialize Demucs separator
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Initializing Demucs model '{model_name}' on {device}")
        self.separator = Separator(
            model=model_name,
            device=device,
            shifts=1,  # Balance quality vs speed
            overlap=0.25,
        )
        logger.info(f"Demucs ready (cache: {cache_dir})")

    async def process_song(
        self,
        audio_path: Path,
        progress_callback: Callable[[float, str], None] | None = None,
        cancellation_event: asyncio.Event | None = None,
    ) -> dict[str, Path]:
        """Process audio file into 4 stems.

        Args:
            audio_path: Path to input audio file
            progress_callback: Optional callback for progress updates (progress, status)
            cancellation_event: Optional event to signal cancellation

        Returns:
            Dictionary mapping stem type to output file path

        Raises:
            ProcessingError: If stem separation fails
            CancellationError: If processing is cancelled
        """
        # Generate cache key from file hash
        file_hash = await self._get_file_hash(audio_path)
        cache_path = self.cache_dir / file_hash
        cache_path.mkdir(parents=True, exist_ok=True)

        # Check if stems already cached
        if await self._check_cache(cache_path):
            logger.info(f"Cache hit for {audio_path.name} ({file_hash})")
            if progress_callback:
                progress_callback(100.0, "Loaded from cache")
            return self._get_stem_paths(cache_path)

        logger.info(f"Processing {audio_path.name} ({file_hash})")

        # Check for cancellation before starting expensive operation
        if cancellation_event and cancellation_event.is_set():
            raise CancellationError("Processing cancelled before starting")

        # Process with Demucs
        try:
            if progress_callback:
                progress_callback(10.0, "Loading audio file...")

            # Check cancellation
            if cancellation_event and cancellation_event.is_set():
                raise CancellationError("Processing cancelled during load")

            # Run separation in thread pool (Demucs is CPU/GPU intensive)
            loop = asyncio.get_event_loop()

            if progress_callback:
                progress_callback(20.0, "Running stem separation...")

            # Check cancellation before expensive ML operation
            if cancellation_event and cancellation_event.is_set():
                raise CancellationError("Processing cancelled before separation")

            stems = await loop.run_in_executor(
                None,
                self._run_separation,
                audio_path,
            )

            # Check cancellation after separation
            if cancellation_event and cancellation_event.is_set():
                # Clean up tensors before raising
                for tensor in stems.values():
                    del tensor
                stems.clear()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                raise CancellationError("Processing cancelled after separation")

            if progress_callback:
                progress_callback(80.0, "Saving stems...")

            # Save stems to cache
            await self._save_stems(stems, cache_path)

            if progress_callback:
                progress_callback(100.0, "Complete")

            logger.info(f"✓ Completed {audio_path.name}")
            return self._get_stem_paths(cache_path)

        except CancellationError:
            logger.warning(f"Cancelled {audio_path.name}")
            # Re-raise cancellation as-is
            raise
        except Exception as e:
            logger.error(f"Failed to process {audio_path.name}: {e}")
            error_msg = f"Stem separation failed: {e}"
            raise ProcessingError(error_msg) from e

    def _run_separation(self, audio_path: Path) -> dict[str, torch.Tensor]:
        """Run Demucs separation synchronously.

        Args:
            audio_path: Path to input audio

        Returns:
            Dictionary of stem tensors
        """
        # Demucs API returns (origin, separated)
        _, separated = self.separator.separate_audio_file(str(audio_path))
        return separated

    async def _save_stems(
        self,
        stems: dict[str, torch.Tensor],
        cache_path: Path,
    ) -> None:
        """Save stem tensors to WAV files.

        Args:
            stems: Dictionary of stem tensors
            cache_path: Directory to save stems
        """
        import torchaudio

        loop = asyncio.get_event_loop()

        for stem_name, tensor in stems.items():
            output_path = cache_path / f"{stem_name}.wav"

            # Save in thread pool (I/O intensive)
            await loop.run_in_executor(
                None,
                torchaudio.save,
                str(output_path),
                tensor,
                44100,  # Sample rate
            )

        # FIXED: Clean up tensors to prevent memory leak
        # Explicitly release PyTorch tensors to free GPU/CPU memory
        for tensor in stems.values():
            del tensor
        stems.clear()

        # Free GPU cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    async def _get_file_hash(self, path: Path) -> str:
        """Generate SHA256 hash of file for caching.

        Args:
            path: File to hash

        Returns:
            First 16 characters of SHA256 hash
        """
        sha256_hash = hashlib.sha256()

        loop = asyncio.get_event_loop()

        def read_chunks() -> bytes:
            """Read file in chunks."""
            with open(path, "rb") as f:
                while chunk := f.read(4096):
                    sha256_hash.update(chunk)
            return sha256_hash.digest()

        await loop.run_in_executor(None, read_chunks)
        return sha256_hash.hexdigest()[:16]

    async def _check_cache(self, cache_path: Path) -> bool:
        """Check if all stems exist in cache.

        Args:
            cache_path: Cache directory to check

        Returns:
            True if all stems are cached
        """
        stem_types = ["drums", "bass", "other", "vocals"]
        return all((cache_path / f"{stem}.wav").exists() for stem in stem_types)

    def _get_stem_paths(self, cache_path: Path) -> dict[str, Path]:
        """Get paths to cached stems.

        Args:
            cache_path: Cache directory

        Returns:
            Dictionary mapping stem type to file path
        """
        return {
            "drums": cache_path / "drums.wav",
            "bass": cache_path / "bass.wav",
            "other": cache_path / "other.wav",  # guitar/keys
            "vocals": cache_path / "vocals.wav",
        }
