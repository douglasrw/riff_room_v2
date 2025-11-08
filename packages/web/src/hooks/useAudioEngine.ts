import { useAudioStore } from '../stores/audioStore';
import type { StemType } from '../services/audioEngine';

export const useAudioEngine = () => {
  const {
    // State
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    loopEnabled,
    loopStart,
    loopEnd,
    mutedStems,
    activeSoloStem,
    currentSong,

    // Actions
    loadSong,
    togglePlay,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    setSoloStem,
    muteStem,
    toggleStemMute,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    skipForward,
    skipBackward,
  } = useAudioStore();

  // Helper to check if specific stem is muted
  const isStemMuted = (stem: StemType): boolean => {
    return mutedStems.has(stem);
  };

  // Helper to get formatted time strings
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    playbackSpeed,
    loopEnabled,
    loopStart,
    loopEnd,
    mutedStems,
    activeSoloStem,
    currentSong,

    // Actions
    loadSong,
    togglePlay,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    setSoloStem,
    muteStem,
    toggleStemMute,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    skipForward,
    skipBackward,

    // Helpers
    isStemMuted,
    formatTime,
    currentTimeFormatted: formatTime(currentTime),
    durationFormatted: formatTime(duration),
  };
};
