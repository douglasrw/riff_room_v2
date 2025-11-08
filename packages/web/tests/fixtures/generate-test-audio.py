#!/usr/bin/env python3
"""
Generate minimal test audio file for E2E testing.

Creates a 3-second audio file with simple tones for each "stem":
- Drums: Kick drum pattern (100Hz pulse)
- Bass: Bass note (80Hz sine wave)
- Other: Guitar-like chord (200Hz + 250Hz + 300Hz)
- Vocals: Mid-range tone (400Hz sine wave)

Output: test-audio.mp3 (~50KB, processes quickly in tests)
"""

import numpy as np
import sys

try:
    import soundfile as sf
except ImportError:
    print("soundfile not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "soundfile"])
    import soundfile as sf

# Audio parameters
SAMPLE_RATE = 44100
DURATION = 3.0  # 3 seconds - short enough for fast tests
NUM_SAMPLES = int(SAMPLE_RATE * DURATION)

# Generate time array
t = np.linspace(0, DURATION, NUM_SAMPLES)

# Generate components for each "stem"
# Drums: Kick drum pattern (pulsing 100Hz)
kick_pattern = np.sin(2 * np.pi * 100 * t)
kick_envelope = np.zeros_like(t)
for i in range(6):  # 6 kicks over 3 seconds (2 per second)
    start = int(i * SAMPLE_RATE * 0.5)
    end = start + int(SAMPLE_RATE * 0.1)  # 100ms kick
    if end < NUM_SAMPLES:
        kick_envelope[start:end] = np.exp(-10 * np.linspace(0, 0.1, end - start))
drums = kick_pattern * kick_envelope * 0.3

# Bass: Simple bass note (80Hz)
bass = np.sin(2 * np.pi * 80 * t) * 0.25

# Other: Guitar-like chord (multiple frequencies)
other = (
    np.sin(2 * np.pi * 200 * t) +
    np.sin(2 * np.pi * 250 * t) +
    np.sin(2 * np.pi * 300 * t)
) * 0.15

# Vocals: Mid-range melody (varying frequency)
vocal_freq = 400 + 50 * np.sin(2 * np.pi * 2 * t)  # Frequency modulation
vocals = np.sin(2 * np.pi * vocal_freq * t) * 0.2

# Mix all stems together
mix = drums + bass + other + vocals

# Normalize to prevent clipping
mix = mix / np.max(np.abs(mix)) * 0.9

# Convert to stereo (duplicate mono channel)
stereo_mix = np.column_stack([mix, mix])

# Save as WAV first (soundfile doesn't support MP3 directly)
wav_path = "test-audio.wav"
sf.write(wav_path, stereo_mix, SAMPLE_RATE)

print(f"✓ Generated {wav_path}")
print(f"  Duration: {DURATION}s")
print(f"  Sample rate: {SAMPLE_RATE}Hz")
print(f"  Size: {len(stereo_mix) * 4 / 1024:.1f}KB (WAV)")

# Try to convert to MP3 using ffmpeg if available
try:
    import subprocess
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            wav_path,
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            "-y",
            "test-audio.mp3",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        print(f"✓ Converted to test-audio.mp3")
        # Get file size
        import os
        mp3_size = os.path.getsize("test-audio.mp3") / 1024
        print(f"  Size: {mp3_size:.1f}KB (MP3)")
    else:
        print("⚠ ffmpeg conversion failed. Using WAV file.")
        print("  Install ffmpeg: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)")
except FileNotFoundError:
    print("⚠ ffmpeg not found. Using WAV file for testing.")
    print("  Install ffmpeg: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)")
except Exception as e:
    print(f"⚠ Error converting to MP3: {e}")
    print("  Using WAV file for testing.")

print("\nTest audio file ready for E2E tests!")
print("Note: Demucs may take 10-15s to process this file even though it's short.")
