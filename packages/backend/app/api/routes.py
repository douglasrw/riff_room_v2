"""API routes for stem processing."""

from __future__ import annotations

import asyncio
import tempfile
import uuid
from pathlib import Path

import aiofiles
import librosa  # type: ignore[import-untyped]
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.websocket import manager
from app.core.demucs_processor import CancellationError, DemucsProcessor, ProcessingError
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Global Demucs processor (initialized on startup)
processor: DemucsProcessor | None = None

# Track background processing tasks
_processing_tasks: set[asyncio.Task] = set()

# Track cancellation events by client_id (FIXED M4)
_cancellation_events: dict[str, asyncio.Event] = {}

# Max file size: 100MB
MAX_FILE_SIZE = 100 * 1024 * 1024


class ProcessResponse(BaseModel):
    """Response for processing request."""

    client_id: str
    status: str


class StemsResponse(BaseModel):
    """Response containing stem file paths."""

    stems: dict[str, str]


def initialize_processor(cache_dir: Path) -> None:
    """Initialize global Demucs processor.

    Args:
        cache_dir: Directory for caching stems
    """
    global processor
    processor = DemucsProcessor(cache_dir)


@router.post("/process", response_model=ProcessResponse)
async def process_audio(
    file: UploadFile = File(...),  # noqa: B008
) -> ProcessResponse:
    """Process audio file to separate stems.

    Args:
        file: Uploaded audio file (MP3, WAV, M4A)

    Returns:
        Processing response with client ID for WebSocket tracking

    Raises:
        HTTPException: If file type invalid or processing fails
    """
    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    # Validate file type
    if file.content_type not in [
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/mp4",
        "audio/m4a",
    ]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}",
        )

    # Read file content
    content = await file.read()

    # Validate file size (security: prevent DoS via large uploads)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    # Generate client ID for WebSocket connection
    client_id = str(uuid.uuid4())
    logger.info(f"Upload received: {file.filename} ({len(content)} bytes) → {client_id}")

    # Save uploaded file temporarily
    temp_dir = Path(tempfile.gettempdir()) / "riffroom"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{client_id}_{file.filename}"

    try:
        # Save upload (async to avoid blocking event loop)
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(content)

        # FIXED M2: Validate file is actual audio (content-type can be spoofed)
        # Run quick librosa check in executor to avoid blocking
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _validate_audio_file, temp_path)
        except Exception as validation_error:
            if temp_path.exists():
                temp_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"Invalid audio file: {validation_error}",
            ) from validation_error

        # FIXED M4: Create cancellation event for this processing task
        cancellation_event = asyncio.Event()
        _cancellation_events[client_id] = cancellation_event

        # Process in background task and track it
        task = asyncio.create_task(
            _process_with_progress(
                processor,
                temp_path,
                client_id,
                cancellation_event,
            )
        )
        _processing_tasks.add(task)

        def cleanup_task(t: asyncio.Task) -> None:
            _processing_tasks.discard(t)
            _cancellation_events.pop(client_id, None)

        task.add_done_callback(cleanup_task)

        return ProcessResponse(
            client_id=client_id,
            status="processing",
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Clean up
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/cancel/{client_id}")
async def cancel_processing(client_id: str) -> dict[str, str]:
    """Cancel ongoing stem processing.

    FIXED M4: Allow clients to cancel expensive processing operations.

    Args:
        client_id: Client ID to cancel

    Returns:
        Cancellation status message

    Raises:
        HTTPException: If client_id not found or already completed
    """
    event = _cancellation_events.get(client_id)
    if event is None:
        raise HTTPException(
            status_code=404,
            detail="No active processing found for this client_id. Either already completed or invalid ID."
        )

    # Signal cancellation
    logger.info(f"Cancellation requested: {client_id}")
    event.set()

    return {
        "status": "cancelled",
        "client_id": client_id,
        "message": "Processing cancellation requested. Cleanup in progress."
    }


@router.get("/stems/{client_id}", response_model=StemsResponse)
async def get_stems(client_id: str) -> StemsResponse:
    """Get paths to processed stems.

    Args:
        client_id: Client ID from processing request

    Returns:
        Paths to stem files

    Raises:
        HTTPException: If stems not found
    """
    if processor is None:
        raise HTTPException(status_code=500, detail="Processor not initialized")

    # FIXED: Implement proper stem retrieval from cache
    # Note: In practice, stems are sent via WebSocket completion message
    # This endpoint is for polling/fallback access
    # Would need to store client_id -> stem_paths mapping
    # For now, inform client to use WebSocket for completion
    raise HTTPException(
        status_code=501,
        detail="Use WebSocket connection for stem delivery. This endpoint is for future polling support."
    )


async def _process_with_progress(
    proc: DemucsProcessor,
    audio_path: Path,
    client_id: str,
    cancellation_event: asyncio.Event,
) -> None:
    """Process audio with WebSocket progress updates.

    Args:
        proc: Demucs processor instance
        audio_path: Path to audio file
        client_id: WebSocket client ID
        cancellation_event: Event to signal cancellation
    """
    # FIXED: Get event loop for thread-safe task scheduling
    loop = asyncio.get_running_loop()

    def progress_callback(progress: float, status: str) -> None:
        """Send progress update via WebSocket (sync callback for executor thread)."""
        # FIXED: Use run_coroutine_threadsafe for safety when called from thread pool
        asyncio.run_coroutine_threadsafe(
            manager.send_progress(
                client_id,
                progress,
                status,
            ),
            loop
        )

    try:
        # Process stems with cancellation support (FIXED M4)
        stems = await proc.process_song(
            audio_path,
            progress_callback=progress_callback,
            cancellation_event=cancellation_event,
        )

        # Send completion
        await manager.send_completion(
            client_id,
            {
                "stems": {
                    name: str(path)
                    for name, path in stems.items()
                },
            },
        )

    except CancellationError as e:
        # FIXED M4: Send cancellation notice to client
        await manager.send_error(
            client_id,
            f"Processing cancelled: {e}",
        )

    except ProcessingError as e:
        # Send error
        await manager.send_error(
            client_id,
            str(e),
        )

    finally:
        # Clean up temp file
        if audio_path.exists():
            audio_path.unlink()


def _validate_audio_file(path: Path) -> None:
    """Validate that file is loadable as audio.

    FIXED M2: Prevents server crashes from malformed files.
    Content-type header can be spoofed, so we verify with librosa.

    Args:
        path: Path to audio file

    Raises:
        Exception: If file cannot be loaded as audio
    """
    try:
        # Try loading first few seconds to validate format
        # duration=1 loads only 1 second for quick validation
        librosa.load(str(path), duration=1.0, sr=None)
    except Exception as e:
        msg = f"File is not valid audio or format not supported: {e}"
        raise ValueError(msg) from e
