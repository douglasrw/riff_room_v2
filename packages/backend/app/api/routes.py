"""API routes for stem processing."""

from __future__ import annotations

import asyncio
import tempfile
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.api.websocket import manager
from app.core.demucs_processor import DemucsProcessor, ProcessingError

router = APIRouter()

# Global Demucs processor (initialized on startup)
processor: DemucsProcessor | None = None

# Track background processing tasks
_processing_tasks: set[asyncio.Task] = set()

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

    # Save uploaded file temporarily
    temp_dir = Path(tempfile.gettempdir()) / "riffroom"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{client_id}_{file.filename}"

    try:
        # Save upload (async to avoid blocking event loop)
        async with aiofiles.open(temp_path, "wb") as f:
            await f.write(content)

        # Process in background task and track it
        task = asyncio.create_task(
            _process_with_progress(
                processor,
                temp_path,
                client_id,
            )
        )
        _processing_tasks.add(task)
        task.add_done_callback(_processing_tasks.discard)

        return ProcessResponse(
            client_id=client_id,
            status="processing",
        )

    except Exception as e:
        # Clean up
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=500, detail=str(e)) from e


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

    # TODO: Implement proper stem retrieval from cache
    # For now, return placeholder
    raise HTTPException(status_code=404, detail="Stems not ready yet")


async def _process_with_progress(
    proc: DemucsProcessor,
    audio_path: Path,
    client_id: str,
) -> None:
    """Process audio with WebSocket progress updates.

    Args:
        proc: Demucs processor instance
        audio_path: Path to audio file
        client_id: WebSocket client ID
    """

    def progress_callback(progress: float, status: str) -> None:
        """Send progress update via WebSocket (sync callback for executor thread)."""
        # Create task to send progress (safe from both sync and async contexts)
        asyncio.create_task(
            manager.send_progress(
                client_id,
                progress,
                status,
            )
        )

    try:
        # Process stems
        stems = await proc.process_song(
            audio_path,
            progress_callback=progress_callback,
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
