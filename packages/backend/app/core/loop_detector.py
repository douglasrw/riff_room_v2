"""
Auto-loop detection system for RiffRoom.

Uses ML-based audio analysis to identify difficult sections
that musicians should practice. Analyzes spectral complexity,
onset density, and harmonic complexity to suggest practice loops.
"""

from pathlib import Path
from typing import Any

import librosa  # type: ignore[import-untyped]
import numpy as np
from scipy.signal import find_peaks


class LoopDetector:
    """Detects difficult sections in audio for practice loops."""

    def __init__(self, hop_length: int = 512, sr: int = 44100):
        """
        Initialize loop detector.

        Args:
            hop_length: Number of samples between successive frames
            sr: Target sample rate for audio loading
        """
        self.hop_length = hop_length
        self.sr = sr
        self.frame_rate = sr / hop_length

    def detect_difficult_sections(
        self, audio_path: str | Path, num_sections: int = 3
    ) -> list[tuple[float, float]]:
        """
        Detect difficult sections using audio complexity analysis.

        Args:
            audio_path: Path to audio file
            num_sections: Number of practice loops to suggest (default 3)

        Returns:
            List of (start_time, end_time) tuples in seconds
        """
        # Load audio
        y, sr_loaded = librosa.load(str(audio_path), sr=self.sr)
        sr = int(sr_loaded)  # Ensure int type

        # Extract features
        spectral_complexity = self._compute_spectral_complexity(y, sr)
        onset_density = self._compute_onset_density(y, sr)
        harmonic_complexity = self._compute_harmonic_complexity(y, sr)

        # FIXED: Resample all features to common length to prevent array size mismatch
        # Different librosa functions can produce different frame counts
        min_length = min(
            len(spectral_complexity), len(onset_density), len(harmonic_complexity)
        )

        spectral_complexity = self._resample_to_length(spectral_complexity, min_length)
        onset_density = self._resample_to_length(onset_density, min_length)
        harmonic_complexity = self._resample_to_length(harmonic_complexity, min_length)

        # Combine features (weighted average)
        # More weight on onset density (fast passages) and harmonic complexity
        difficulty_curve = (
            0.3 * self._normalize(spectral_complexity)
            + 0.4 * self._normalize(onset_density)
            + 0.3 * self._normalize(harmonic_complexity)
        )

        # Smooth curve to reduce noise
        difficulty_curve = self._smooth_curve(difficulty_curve, window_len=21)

        # Find peaks (difficult sections)
        peaks, properties = find_peaks(
            difficulty_curve,
            height=0.6,  # Only high-difficulty sections
            distance=int(4 * self.frame_rate),  # Min 4 seconds apart
            prominence=0.2,  # Peaks must stand out
        )

        # Sort by difficulty (peak height) and take top N
        sorted_peaks = sorted(
            peaks, key=lambda p: difficulty_curve[p], reverse=True
        )[:num_sections]

        # Convert to time segments (4-second windows around peaks)
        sections = []
        duration = len(difficulty_curve) / self.frame_rate

        for peak in sorted(sorted_peaks):  # Sort by time
            # Create 4-second window around peak
            center_time = peak / self.frame_rate
            start_time = max(0, center_time - 2.0)
            end_time = min(duration, center_time + 2.0)

            sections.append((start_time, end_time))

        return sections

    def _compute_spectral_complexity(
        self, y: np.ndarray, sr: int
    ) -> np.ndarray:
        """
        Measure spectral complexity.

        High spectral variance indicates complex timbres and harmonics.

        Args:
            y: Audio time series
            sr: Sample rate

        Returns:
            Frame-wise spectral complexity scores
        """
        # Compute STFT
        stft = librosa.stft(y, hop_length=self.hop_length)
        magnitude = np.abs(stft)

        # Spectral centroid (brightness)
        centroid = librosa.feature.spectral_centroid(
            S=magnitude, sr=sr, hop_length=self.hop_length
        )[0]

        # Spectral rolloff (high-frequency content)
        rolloff = librosa.feature.spectral_rolloff(
            S=magnitude, sr=sr, hop_length=self.hop_length, roll_percent=0.85
        )[0]

        # Spectral bandwidth (spread of frequencies)
        bandwidth = librosa.feature.spectral_bandwidth(
            S=magnitude, sr=sr, hop_length=self.hop_length
        )[0]

        # Combine: higher values = more complex
        complexity = (
            self._local_variance(centroid, 11)
            + self._local_variance(rolloff, 11)
            + bandwidth / 1000.0  # Normalize bandwidth
        )

        return complexity

    def _compute_onset_density(self, y: np.ndarray, sr: int) -> np.ndarray:
        """
        Measure note onset density.

        More onsets = faster passages = more difficult.

        Args:
            y: Audio time series
            sr: Sample rate

        Returns:
            Frame-wise onset density scores
        """
        # Compute onset strength envelope
        onset_envelope = librosa.onset.onset_strength(
            y=y, sr=sr, hop_length=self.hop_length
        )

        # Use sliding window to compute local density
        window_size = int(2 * self.frame_rate)  # 2-second windows
        density = np.convolve(
            onset_envelope, np.ones(window_size) / window_size, mode="same"
        )

        return density

    def _compute_harmonic_complexity(
        self, y: np.ndarray, sr: int
    ) -> np.ndarray:
        """
        Measure harmonic complexity.

        More active chord changes and harmonics = more difficult.

        Args:
            y: Audio time series
            sr: Sample rate

        Returns:
            Frame-wise harmonic complexity scores
        """
        # Separate harmonic and percussive components
        harmonic, percussive = librosa.effects.hpss(y)

        # Compute chromagram (pitch classes)
        chroma = librosa.feature.chroma_stft(
            y=harmonic, sr=sr, hop_length=self.hop_length
        )

        # Entropy of chroma indicates harmonic complexity
        # Add small epsilon to avoid log(0)
        chroma_normalized = chroma / (chroma.sum(axis=0, keepdims=True) + 1e-10)
        entropy = -np.sum(
            chroma_normalized * np.log2(chroma_normalized + 1e-10), axis=0
        )

        # Also measure harmonic change flux
        chroma_diff = np.diff(chroma, axis=1, prepend=chroma[:, :1])
        flux = np.sqrt(np.sum(chroma_diff**2, axis=0))

        # Combine entropy and flux
        complexity = entropy + flux * 10  # Weight flux higher

        return complexity

    def _local_variance(
        self, signal: np.ndarray, window_len: int = 11
    ) -> np.ndarray:
        """
        Compute local variance of signal efficiently using convolution.

        FIXED: O(n) complexity using var(X) = E[X²] - E[X]² formula,
        replacing O(n*window) naive list comprehension.

        Args:
            signal: Input signal
            window_len: Window size for variance calculation

        Returns:
            Frame-wise local variance
        """
        # Create uniform window for rolling mean
        window = np.ones(window_len) / window_len

        # Compute rolling mean: E[X]
        mean = np.convolve(signal, window, mode="same")

        # Compute rolling mean of squares: E[X²]
        mean_of_squares = np.convolve(signal**2, window, mode="same")

        # Variance: E[X²] - E[X]²
        variance = mean_of_squares - mean**2

        # Handle numerical precision issues (variance should be non-negative)
        variance = np.maximum(variance, 0)

        return variance

    def _smooth_curve(
        self, curve: np.ndarray, window_len: int = 21
    ) -> np.ndarray:
        """
        Smooth difficulty curve using convolution.

        Args:
            curve: Input curve
            window_len: Smoothing window length (must be odd)

        Returns:
            Smoothed curve
        """
        # Use Hamming window for smoothing
        window = np.hamming(window_len)
        window = window / window.sum()

        # Convolve with padding
        smoothed = np.convolve(curve, window, mode="same")

        return smoothed

    def _normalize(self, arr: np.ndarray) -> np.ndarray:
        """
        Normalize array to [0, 1] range.

        Args:
            arr: Input array

        Returns:
            Normalized array
        """
        min_val = arr.min()
        max_val = arr.max()

        if max_val - min_val < 1e-10:
            return np.zeros_like(arr)

        return (arr - min_val) / (max_val - min_val)

    def _resample_to_length(self, arr: np.ndarray, target_length: int) -> np.ndarray:
        """
        Resample array to target length using linear interpolation.

        FIXED: Ensures all feature arrays have same length before combining.

        Args:
            arr: Input array
            target_length: Desired output length

        Returns:
            Resampled array of length target_length
        """
        if len(arr) == target_length:
            return arr

        # Use linear interpolation to resample
        x_old = np.linspace(0, 1, len(arr))
        x_new = np.linspace(0, 1, target_length)
        return np.interp(x_new, x_old, arr)

    def get_loop_metadata(
        self, audio_path: str | Path, sections: list[tuple[float, float]]
    ) -> list[dict[str, Any]]:
        """
        Get detailed metadata for detected loops.

        Args:
            audio_path: Path to audio file
            sections: List of (start, end) time tuples

        Returns:
            List of loop metadata dicts with difficulty scores
        """
        y, sr_loaded = librosa.load(str(audio_path), sr=self.sr)
        sr = int(sr_loaded)  # Ensure int type

        metadata = []
        for i, (start, end) in enumerate(sections, 1):
            # Extract segment
            start_sample = int(start * sr)
            end_sample = int(end * sr)
            segment = y[start_sample:end_sample]

            # Compute segment features
            tempo, _ = librosa.beat.beat_track(y=segment, sr=sr)
            chroma = librosa.feature.chroma_stft(y=segment, sr=sr)
            rms = librosa.feature.rms(y=segment)[0]

            metadata.append(
                {
                    "loop_number": i,
                    "start_time": round(start, 2),
                    "end_time": round(end, 2),
                    "duration": round(end - start, 2),
                    "estimated_tempo": round(float(tempo), 1),
                    "avg_energy": round(float(rms.mean()), 3),
                    "harmonic_activity": round(float(chroma.std()), 3),
                }
            )

        return metadata
