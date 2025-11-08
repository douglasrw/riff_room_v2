import { useHotkeys } from 'react-hotkeys-hook';
import { useAudioStore } from '../stores/audioStore';

export const useKeyboardShortcuts = () => {
  const {
    togglePlay,
    setSoloStem,
    muteStem,
    setSpeed,
    setLoopStart,
    setLoopEnd,
    clearLoop,
    skipForward,
    skipBackward,
    setShowShortcuts,
    playbackSpeed,
  } = useAudioStore();

  // Play/Pause - Space
  useHotkeys('space', (e) => {
    e.preventDefault();
    togglePlay();
  }, { enableOnFormTags: false }, [togglePlay]);

  // Solo stems - 1, 2, 3, 4
  useHotkeys('1', () => setSoloStem('drums'), [setSoloStem]);
  useHotkeys('2', () => setSoloStem('bass'), [setSoloStem]);
  useHotkeys('3', () => setSoloStem('other'), [setSoloStem]);
  useHotkeys('4', () => setSoloStem('vocals'), [setSoloStem]);

  // Unsolo all - 0
  useHotkeys('0', () => setSoloStem(null), [setSoloStem]);

  // Mute stems - Shift+1-4
  useHotkeys('shift+1', () => muteStem('drums'), [muteStem]);
  useHotkeys('shift+2', () => muteStem('bass'), [muteStem]);
  useHotkeys('shift+3', () => muteStem('other'), [muteStem]);
  useHotkeys('shift+4', () => muteStem('vocals'), [muteStem]);

  // Speed control - S (cycle through speeds)
  useHotkeys('s', () => {
    const speeds = [0.7, 0.85, 1.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  }, [playbackSpeed, setSpeed]);

  // Loop markers
  useHotkeys('[', () => setLoopStart(), [setLoopStart]);
  useHotkeys(']', () => setLoopEnd(), [setLoopEnd]);
  useHotkeys('shift+[', () => clearLoop(), [clearLoop]);

  // Navigation - Arrow keys
  useHotkeys('left', () => skipBackward(5), [skipBackward]);
  useHotkeys('right', () => skipForward(5), [skipForward]);
  useHotkeys('shift+left', () => skipBackward(10), [skipBackward]);
  useHotkeys('shift+right', () => skipForward(10), [skipForward]);

  // Show shortcuts overlay - ?
  useHotkeys('shift+/', () => setShowShortcuts(true), [setShowShortcuts]);

  // Escape to close shortcuts overlay
  useHotkeys('escape', () => setShowShortcuts(false), [setShowShortcuts]);
};

// Export shortcuts reference for UI display
export const KEYBOARD_SHORTCUTS = {
  playback: [
    { keys: ['Space'], description: 'Play/Pause' },
    { keys: ['Left'], description: 'Skip back 5s' },
    { keys: ['Right'], description: 'Skip forward 5s' },
    { keys: ['Shift', 'Left'], description: 'Skip back 10s' },
    { keys: ['Shift', 'Right'], description: 'Skip forward 10s' },
  ],
  stems: [
    { keys: ['1'], description: 'Solo drums' },
    { keys: ['2'], description: 'Solo bass' },
    { keys: ['3'], description: 'Solo other (guitar/keys)' },
    { keys: ['4'], description: 'Solo vocals' },
    { keys: ['0'], description: 'Unsolo all' },
    { keys: ['Shift', '1-4'], description: 'Mute/unmute stem' },
  ],
  speed: [
    { keys: ['S'], description: 'Cycle speed (70% > 85% > 100%)' },
  ],
  loop: [
    { keys: ['['], description: 'Set loop start' },
    { keys: [']'], description: 'Set loop end' },
    { keys: ['Shift', '['], description: 'Clear loop' },
  ],
  ui: [
    { keys: ['?'], description: 'Show shortcuts' },
    { keys: ['Esc'], description: 'Close shortcuts' },
  ],
};
