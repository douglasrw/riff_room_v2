import { create } from 'zustand';
import { AudioEngine, StemType, StemPaths, AudioEngineState } from '../services/audioEngine';

interface Song {
  id: string;
  title: string;
  artist: string;
  stems: StemPaths;
}

interface AudioStore {
  // State from AudioEngineState
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  loopEnabled: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  mutedStems: Set<StemType>;
  activeSoloStem: StemType | null;
  stemVolumes: Map<StemType, number>;
  masterVolume: number;

  // Song data
  currentSong: Song | null;

  // UI state
  showShortcuts: boolean;
  isLoadingStems: boolean;

  // Actions
  loadSong: (song: Song) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setSpeed: (speed: number) => void;
  setSoloStem: (stem: StemType | null) => void;
  muteStem: (stem: StemType) => void;
  toggleStemMute: (stem: StemType) => void;
  setStemVolume: (stem: StemType, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  setLoopStart: () => void;
  setLoopEnd: () => void;
  clearLoop: () => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  setShowShortcuts: (show: boolean) => void;

  // Internal
  _engine: AudioEngine;
  _updateFromEngine: (state: Partial<Omit<AudioEngineState, 'soloStem'>> & { activeSoloStem?: StemType | null }) => void;
}

const audioEngine = new AudioEngine();

export const useAudioStore = create<AudioStore>((set, get) => {
  // Set up engine state change callback
  audioEngine.setOnStateChange((engineState) => {
    const { soloStem, ...rest } = engineState;
    get()._updateFromEngine({
      ...rest,
      activeSoloStem: soloStem,
    });
  });

  return {
    // Initial state
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
    isLoadingStems: false,

    // Engine reference
    _engine: audioEngine,

    // Actions
    loadSong: async (song: Song) => {
      // FIXED C5: Don't set currentSong until stems actually load
      // Prevents state inconsistency where UI shows new song but engine has old/no audio
      set({ isLoadingStems: true });
      try {
        // Pass songId to enable caching
        await audioEngine.loadStems(song.stems, song.id);
        // Only set currentSong after successful load
        set({ currentSong: song, isLoadingStems: false });
      } catch (error) {
        // On error, clear currentSong to prevent playing wrong audio
        set({ currentSong: null, isLoadingStems: false });
        throw error;
      }
    },

    togglePlay: async () => {
      const { isPlaying } = get();
      if (isPlaying) {
        get().pause();
      } else {
        await get().play();
      }
    },

    play: async () => {
      await audioEngine.play();
    },

    pause: () => {
      audioEngine.pause();
    },

    stop: () => {
      audioEngine.stop();
    },

    seek: (time: number) => {
      audioEngine.seek(time);
    },

    setSpeed: (speed: number) => {
      audioEngine.setSpeed(speed);
    },

    setSoloStem: (stem: StemType | null) => {
      audioEngine.soloStem(stem);
    },

    muteStem: (stem: StemType) => {
      audioEngine.muteStem(stem);
      // FIXED: Always create new Set for Zustand to detect change
      // Zustand uses shallow equality, so Set reference must change
      set({ mutedStems: new Set(audioEngine.getMutedStems()) });
    },

    toggleStemMute: (stem: StemType) => {
      get().muteStem(stem);
    },

    setStemVolume: (stem: StemType, volume: number) => {
      audioEngine.setStemVolume(stem, volume);
    },

    setMasterVolume: (volume: number) => {
      audioEngine.setMasterVolume(volume);
    },

    setLoopStart: () => {
      const { currentTime, loopEnd } = get();
      if (loopEnd !== null && currentTime < loopEnd) {
        audioEngine.setLoop(currentTime, loopEnd);
      } else {
        set({ loopStart: currentTime });
      }
    },

    setLoopEnd: () => {
      const { currentTime, loopStart } = get();
      if (loopStart !== null && currentTime > loopStart) {
        audioEngine.setLoop(loopStart, currentTime);
      } else {
        set({ loopEnd: currentTime });
      }
    },

    clearLoop: () => {
      audioEngine.clearLoop();
    },

    skipForward: (seconds: number) => {
      const { currentTime, duration } = get();
      const newTime = Math.min(currentTime + seconds, duration);
      audioEngine.seek(newTime);
    },

    skipBackward: (seconds: number) => {
      const { currentTime } = get();
      const newTime = Math.max(currentTime - seconds, 0);
      audioEngine.seek(newTime);
    },

    setShowShortcuts: (show: boolean) => {
      set({ showShortcuts: show });
    },

    // Internal state updater
    _updateFromEngine: (state) => {
      set(state);
    },
  };
});
