import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAudioStore } from './audioStore';
import type { StemType } from '../services/audioEngine';

// Mock audioEngine
vi.mock('../services/audioEngine', () => ({
  AudioEngine: vi.fn().mockImplementation(() => ({
    loadStems: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    setSpeed: vi.fn(),
    soloStem: vi.fn(),
    muteStem: vi.fn(),
    setStemVolume: vi.fn(),
    setMasterVolume: vi.fn(),
    setLoop: vi.fn(),
    clearLoop: vi.fn(),
    getMutedStems: vi.fn(() => new Set()),
    dispose: vi.fn(),
    setOnStateChange: vi.fn(),
  })),
  StemType: {},
  StemPaths: {},
  AudioEngineState: {},
}));

describe('audioStore', () => {
  beforeEach(() => {
    // Reset store state
    useAudioStore.setState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: 1.0,
      loopEnabled: false,
      loopStart: null,
      loopEnd: null,
      mutedStems: new Set(),
      activeSoloStem: null,
      stemVolumes: new Map(),
      masterVolume: 1.0,
      currentSong: null,
      showShortcuts: false,
    });
  });

  it('should initialize with default state', () => {
    const state = useAudioStore.getState();

    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(state.playbackSpeed).toBe(1.0);
    expect(state.masterVolume).toBe(1.0);
    expect(state.currentSong).toBeNull();
  });

  it('should update playback speed', () => {
    const { setSpeed } = useAudioStore.getState();

    setSpeed(0.7);

    // State might not update immediately due to engine callback
    // In real app, engine would call _updateFromEngine
    expect(useAudioStore.getState()._engine.setSpeed).toHaveBeenCalledWith(0.7);
  });

  it('should toggle shortcuts overlay', () => {
    const { setShowShortcuts } = useAudioStore.getState();

    expect(useAudioStore.getState().showShortcuts).toBe(false);

    setShowShortcuts(true);
    expect(useAudioStore.getState().showShortcuts).toBe(true);

    setShowShortcuts(false);
    expect(useAudioStore.getState().showShortcuts).toBe(false);
  });

  it('should set solo stem', () => {
    const { setSoloStem } = useAudioStore.getState();

    setSoloStem('drums');

    expect(useAudioStore.getState()._engine.soloStem).toHaveBeenCalledWith('drums');
  });

  it('should mute stem and update state', () => {
    const { muteStem, _engine } = useAudioStore.getState();

    // Mock getMutedStems to return drums as muted
    _engine.getMutedStems = vi.fn(() => new Set<StemType>(['drums']));

    muteStem('drums');

    expect(_engine.muteStem).toHaveBeenCalledWith('drums');
    expect(useAudioStore.getState().mutedStems).toEqual(new Set(['drums']));
  });

  it('should set master volume', () => {
    const { setMasterVolume } = useAudioStore.getState();

    setMasterVolume(0.5);

    expect(useAudioStore.getState()._engine.setMasterVolume).toHaveBeenCalledWith(0.5);
  });

  it('should skip forward', () => {
    const { skipForward, _updateFromEngine } = useAudioStore.getState();

    // Set initial time
    _updateFromEngine({ currentTime: 10, duration: 100 });

    skipForward(5);

    expect(useAudioStore.getState()._engine.seek).toHaveBeenCalledWith(15);
  });

  it('should skip backward', () => {
    const { skipBackward, _updateFromEngine } = useAudioStore.getState();

    // Set initial time
    _updateFromEngine({ currentTime: 10 });

    skipBackward(5);

    expect(useAudioStore.getState()._engine.seek).toHaveBeenCalledWith(5);
  });

  it('should not skip backward below 0', () => {
    const { skipBackward, _updateFromEngine } = useAudioStore.getState();

    // Set initial time
    _updateFromEngine({ currentTime: 3 });

    skipBackward(5);

    expect(useAudioStore.getState()._engine.seek).toHaveBeenCalledWith(0);
  });

  it('should not skip forward beyond duration', () => {
    const { skipForward, _updateFromEngine } = useAudioStore.getState();

    // Set initial time and duration
    _updateFromEngine({ currentTime: 95, duration: 100 });

    skipForward(10);

    expect(useAudioStore.getState()._engine.seek).toHaveBeenCalledWith(100);
  });
});
