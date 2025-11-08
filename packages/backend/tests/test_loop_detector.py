"""Tests for loop detector module."""
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np
import pytest

from app.core.loop_detector import LoopDetector


@pytest.fixture
def detector() -> LoopDetector:
    """Create a LoopDetector instance for testing."""
    return LoopDetector(hop_length=512, sr=22050)


@pytest.fixture
def mock_audio_path(tmp_path: Path) -> Path:
    """Create a temporary audio file path."""
    audio_file = tmp_path / "test_audio.wav"
    audio_file.touch()
    return audio_file


class TestLoopDetectorInit:
    """Test LoopDetector initialization."""

    def test_init_default_params(self) -> None:
        """Test initialization with default parameters."""
        detector = LoopDetector()
        assert detector.hop_length == 512
        assert detector.sr == 44100
        assert detector.frame_rate == 44100 / 512

    def test_init_custom_params(self) -> None:
        """Test initialization with custom parameters."""
        detector = LoopDetector(hop_length=256, sr=22050)
        assert detector.hop_length == 256
        assert detector.sr == 22050
        assert detector.frame_rate == 22050 / 256


class TestHelperMethods:
    """Test private helper methods."""

    def test_normalize_standard_range(self, detector: LoopDetector) -> None:
        """Test normalization with standard range."""
        arr = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        normalized = detector._normalize(arr)

        assert normalized.min() == pytest.approx(0.0)
        assert normalized.max() == pytest.approx(1.0)
        assert len(normalized) == len(arr)

    def test_normalize_constant_array(self, detector: LoopDetector) -> None:
        """Test normalization with constant values (edge case)."""
        arr = np.array([5.0, 5.0, 5.0, 5.0])
        normalized = detector._normalize(arr)

        # Should return zeros when all values are same
        assert np.allclose(normalized, np.zeros_like(arr))

    def test_normalize_negative_values(self, detector: LoopDetector) -> None:
        """Test normalization with negative values."""
        arr = np.array([-5.0, -2.0, 0.0, 2.0, 5.0])
        normalized = detector._normalize(arr)

        assert normalized.min() == pytest.approx(0.0)
        assert normalized.max() == pytest.approx(1.0)

    def test_resample_to_length_same_length(self, detector: LoopDetector) -> None:
        """Test resampling when lengths match."""
        arr = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        resampled = detector._resample_to_length(arr, 5)

        assert np.allclose(resampled, arr)

    def test_resample_to_length_downsample(self, detector: LoopDetector) -> None:
        """Test downsampling to shorter length."""
        arr = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        resampled = detector._resample_to_length(arr, 3)

        assert len(resampled) == 3
        # First and last values should be preserved
        assert resampled[0] == pytest.approx(1.0)
        assert resampled[-1] == pytest.approx(5.0)

    def test_resample_to_length_upsample(self, detector: LoopDetector) -> None:
        """Test upsampling to longer length."""
        arr = np.array([1.0, 5.0])
        resampled = detector._resample_to_length(arr, 5)

        assert len(resampled) == 5
        # Should interpolate linearly
        assert resampled[0] == pytest.approx(1.0)
        assert resampled[-1] == pytest.approx(5.0)
        assert resampled[2] == pytest.approx(3.0, abs=0.1)

    def test_smooth_curve(self, detector: LoopDetector) -> None:
        """Test curve smoothing."""
        # Create noisy signal
        curve = np.array([1.0, 5.0, 2.0, 6.0, 3.0, 7.0, 4.0])
        smoothed = detector._smooth_curve(curve, window_len=3)

        assert len(smoothed) == len(curve)
        # Smoothed curve should have less variance
        assert np.var(smoothed) < np.var(curve)

    def test_local_variance(self, detector: LoopDetector) -> None:
        """Test local variance computation."""
        # Create signal with clear transition (high variance in middle)
        signal = np.array([1.0, 1.0, 1.0, 1.0, 10.0, 1.0, 1.0, 1.0, 1.0])
        variance = detector._local_variance(signal, window_len=5)

        assert len(variance) == len(signal)
        # Transition point should have higher variance than constant regions
        assert variance[4] > variance[0]
        assert variance[4] > variance[8]

    def test_local_variance_constant_signal(self, detector: LoopDetector) -> None:
        """Test local variance with constant signal."""
        signal = np.array([3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.0])
        variance = detector._local_variance(signal, window_len=3)

        # Constant signal should have near-zero variance
        assert np.allclose(variance, np.zeros_like(signal), atol=1e-6)


class TestFeatureComputation:
    """Test audio feature computation methods."""

    def test_compute_spectral_complexity(self, detector: LoopDetector) -> None:
        """Test spectral complexity computation."""
        # Create synthetic audio (sine wave)
        duration = 1.0  # 1 second
        y = np.sin(2 * np.pi * 440 * np.linspace(0, duration, int(detector.sr * duration)))

        complexity = detector._compute_spectral_complexity(y, detector.sr)

        assert len(complexity) > 0
        assert np.all(np.isfinite(complexity))

    def test_compute_onset_density(self, detector: LoopDetector) -> None:
        """Test onset density computation."""
        # Create audio with clear onsets (impulses)
        y = np.zeros(detector.sr)
        y[::1000] = 1.0  # Add impulses every 1000 samples

        density = detector._compute_onset_density(y, detector.sr)

        assert len(density) > 0
        assert np.all(np.isfinite(density))
        assert np.max(density) > 0  # Should detect onsets

    def test_compute_harmonic_complexity(self, detector: LoopDetector) -> None:
        """Test harmonic complexity computation."""
        # Create synthetic audio (sine wave)
        duration = 1.0
        y = np.sin(2 * np.pi * 440 * np.linspace(0, duration, int(detector.sr * duration)))

        complexity = detector._compute_harmonic_complexity(y, detector.sr)

        assert len(complexity) > 0
        assert np.all(np.isfinite(complexity))

    def test_compute_harmonic_complexity_with_silence(
        self, detector: LoopDetector
    ) -> None:
        """Test harmonic complexity with silent audio."""
        y = np.zeros(detector.sr)

        complexity = detector._compute_harmonic_complexity(y, detector.sr)

        assert len(complexity) > 0
        assert np.all(np.isfinite(complexity))


class TestDifficultSectionDetection:
    """Test main difficult section detection functionality."""

    @patch("librosa.load")
    def test_detect_difficult_sections_basic(
        self, mock_load: Mock, detector: LoopDetector, mock_audio_path: Path
    ) -> None:
        """Test basic difficult section detection."""
        # Create synthetic audio with clear difficulty pattern
        duration = 10.0  # 10 seconds
        y = np.sin(2 * np.pi * 440 * np.linspace(0, duration, int(detector.sr * duration)))

        # Add high-frequency burst in the middle to create a "difficult" section
        mid_start = int(detector.sr * 4)
        mid_end = int(detector.sr * 6)
        y[mid_start:mid_end] += np.sin(
            2 * np.pi * 4400 * np.linspace(0, 2.0, mid_end - mid_start)
        )

        mock_load.return_value = (y, float(detector.sr))

        sections = detector.detect_difficult_sections(mock_audio_path, num_sections=3)

        assert len(sections) <= 3
        for start, end in sections:
            assert 0 <= start < end
            assert end <= duration
            assert end - start <= 4.0  # Max 4-second windows

    @patch("librosa.load")
    def test_detect_difficult_sections_no_peaks(
        self, mock_load: Mock, detector: LoopDetector, mock_audio_path: Path
    ) -> None:
        """Test detection with very simple audio (no clear peaks)."""
        # Simple sine wave (low difficulty)
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 5.0, int(detector.sr * 5)))
        mock_load.return_value = (y, float(detector.sr))

        sections = detector.detect_difficult_sections(mock_audio_path, num_sections=3)

        # May return 0-3 sections depending on threshold
        assert isinstance(sections, list)
        assert len(sections) <= 3

    @patch("librosa.load")
    def test_detect_difficult_sections_custom_num_sections(
        self, mock_load: Mock, detector: LoopDetector, mock_audio_path: Path
    ) -> None:
        """Test detection with custom number of sections."""
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 20.0, int(detector.sr * 20)))
        mock_load.return_value = (y, float(detector.sr))

        sections = detector.detect_difficult_sections(mock_audio_path, num_sections=5)

        assert len(sections) <= 5

    @patch("librosa.load")
    def test_detect_difficult_sections_string_path(
        self, mock_load: Mock, detector: LoopDetector
    ) -> None:
        """Test detection with string path (not Path object)."""
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 5.0, int(detector.sr * 5)))
        mock_load.return_value = (y, float(detector.sr))

        sections = detector.detect_difficult_sections("/fake/path.wav", num_sections=2)

        assert isinstance(sections, list)
        mock_load.assert_called_once()


class TestLoopMetadata:
    """Test loop metadata generation."""

    @patch("librosa.beat.beat_track")
    @patch("librosa.feature.chroma_stft")
    @patch("librosa.feature.rms")
    @patch("librosa.load")
    def test_get_loop_metadata(
        self,
        mock_load: Mock,
        mock_rms: Mock,
        mock_chroma: Mock,
        mock_beat_track: Mock,
        detector: LoopDetector,
        mock_audio_path: Path,
    ) -> None:
        """Test loop metadata generation."""
        # Setup mocks
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 10.0, int(detector.sr * 10)))
        mock_load.return_value = (y, float(detector.sr))
        mock_beat_track.return_value = (120.0, np.array([0, 22050, 44100]))
        mock_chroma.return_value = np.random.rand(12, 100)
        mock_rms.return_value = np.array([np.random.rand(100)])

        sections = [(1.0, 3.0), (5.0, 7.0)]
        metadata = detector.get_loop_metadata(mock_audio_path, sections)

        assert len(metadata) == 2
        for i, meta in enumerate(metadata, 1):
            assert meta["loop_number"] == i
            assert "start_time" in meta
            assert "end_time" in meta
            assert "duration" in meta
            assert "estimated_tempo" in meta
            assert "avg_energy" in meta
            assert "harmonic_activity" in meta
            assert meta["duration"] > 0

    @patch("librosa.beat.beat_track")
    @patch("librosa.feature.chroma_stft")
    @patch("librosa.feature.rms")
    @patch("librosa.load")
    def test_get_loop_metadata_empty_sections(
        self,
        mock_load: Mock,
        mock_rms: Mock,
        mock_chroma: Mock,
        mock_beat_track: Mock,
        detector: LoopDetector,
        mock_audio_path: Path,
    ) -> None:
        """Test metadata generation with empty sections list."""
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 5.0, int(detector.sr * 5)))
        mock_load.return_value = (y, float(detector.sr))

        metadata = detector.get_loop_metadata(mock_audio_path, [])

        assert metadata == []

    @patch("librosa.beat.beat_track")
    @patch("librosa.feature.chroma_stft")
    @patch("librosa.feature.rms")
    @patch("librosa.load")
    def test_get_loop_metadata_rounded_values(
        self,
        mock_load: Mock,
        mock_rms: Mock,
        mock_chroma: Mock,
        mock_beat_track: Mock,
        detector: LoopDetector,
        mock_audio_path: Path,
    ) -> None:
        """Test that metadata values are properly rounded."""
        y = np.sin(2 * np.pi * 440 * np.linspace(0, 5.0, int(detector.sr * 5)))
        mock_load.return_value = (y, float(detector.sr))
        mock_beat_track.return_value = (120.456, np.array([0]))
        mock_chroma.return_value = np.random.rand(12, 10)
        mock_rms.return_value = np.array([np.random.rand(10)])

        sections = [(1.234567, 3.456789)]
        metadata = detector.get_loop_metadata(mock_audio_path, sections)

        assert metadata[0]["start_time"] == 1.23
        assert metadata[0]["end_time"] == 3.46
        assert metadata[0]["duration"] == 2.22
        # Tempo rounded to 1 decimal
        assert isinstance(metadata[0]["estimated_tempo"], (int, float))
