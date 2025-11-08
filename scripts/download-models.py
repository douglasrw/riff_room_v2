#!/usr/bin/env python3
"""
Download ML models for RiffRoom.

Downloads the Demucs model for stem separation.
Uses torch.hub to download pre-trained models.
"""

import sys
from pathlib import Path


def check_dependencies():
    """Ensure required packages are installed."""
    try:
        import torch
        import demucs
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("[INFO] Run 'cd packages/backend && uv sync' first")
        sys.exit(1)


def download_demucs_model():
    """Download Demucs htdemucs_ft model."""
    print("[INFO] Downloading Demucs model (htdemucs_ft)...")
    print("       This may take a few minutes on first run...")

    try:
        # Import here after dependency check
        from demucs.pretrained import get_model
        import torch

        # Download the fine-tuned model
        # This will cache it in ~/.cache/torch/hub/checkpoints/
        model = get_model("htdemucs_ft")

        # Get model size
        total_params = sum(p.numel() for p in model.parameters())
        print("[OK] Model downloaded successfully!")
        print(f"     Parameters: {total_params:,}")
        print("     Cache location: ~/.cache/torch/hub/checkpoints/")

        # Clean up
        del model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return True

    except Exception as e:
        print(f"[ERROR] Failed to download model: {e}")
        return False


def verify_model():
    """Verify model is accessible."""
    try:
        from demucs.pretrained import get_model

        # Quick check that model loads
        model = get_model("htdemucs_ft")
        print("[OK] Model verification successful")
        del model
        return True

    except Exception as e:
        print(f"[WARN] Model verification failed: {e}")
        return False


def main():
    print("=" * 60)
    print("RiffRoom ML Model Setup")
    print("=" * 60)
    print()

    # Check dependencies
    check_dependencies()

    # Download model
    if not download_demucs_model():
        sys.exit(1)

    print()

    # Verify
    if not verify_model():
        print("[WARN] Model verification failed")
        print("       Model may still work, but recommend re-running this script")

    print()
    print("=" * 60)
    print("[OK] All models ready!")
    print("=" * 60)
    print()
    print("Next: Run 'pnpm dev' to start development")


if __name__ == "__main__":
    main()
