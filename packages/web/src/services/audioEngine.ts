import * as Tone from 'tone';
import { stemCache } from './cacheManager';

export type StemType = 'drums' | 'bass' | 'other' | 'vocals';

export interface StemPaths {
  drums: string;
  bass: string;
  other: string;
  vocals: string;
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  loopEnabled: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  mutedStems: Set<StemType>;
  soloStem: StemType | null;
  stemVolumes: Map<StemType, number>;
  masterVolume: number;
}

export class AudioEngine {
  private players: Map<StemType, Tone.Player> = new Map();
  private volumes: Map<StemType, Tone.Volume> = new Map();
  private masterVolume: Tone.Volume;
  private transport: typeof Tone.Transport;
  private onStateChange?: (state: Partial<AudioEngineState>) => void;
  private animationFrameId: number | null = null;
  private stemVolumes: Map<StemType, number> = new Map();
  private crossfadeDuration: number = 0.05; // 50ms default crossfade
  private loopCheckInterval: number | null = null;

  constructor() {
    this.transport = Tone.Transport;
    this.masterVolume = new Tone.Volume(0).toDestination();
    this.setupAudioContext();
  }

  private setupAudioContext(): void {
    this.transport.loop = false;
    this.transport.bpm.value = 120;
  }

  setOnStateChange(callback: (state: Partial<AudioEngineState>) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(state: Partial<AudioEngineState>): void {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  async loadStems(stems: StemPaths, songId?: string): Promise<void> {
    this.dispose();

    if (Tone.context.state === 'suspended') {
      await Tone.start();
    }

    const loadPromises = Object.entries(stems).map(async ([name, url]) => {
      try {
        // Create volume node for this stem
        const volumeNode = new Tone.Volume(0).connect(this.masterVolume);

        // Try cache first if songId provided
        let audioUrl = url;
        if (songId) {
          const cachedBlob = await stemCache.getStem(songId, name);
          if (cachedBlob) {
            console.log(`${name} stem loaded from cache`);
            audioUrl = URL.createObjectURL(cachedBlob);
          } else {
            // Fetch and cache for next time
            this.cacheStemFromUrl(songId, name, url);
          }
        }

        const player = new Tone.Player({
          url: audioUrl,
          loop: false,
          onload: () => console.log(`${name} stem loaded`),
          onerror: (error) => {
            console.error(`Error loading ${name}:`, error);
            throw new Error(`Failed to load ${name} stem: ${error}`);
          },
        }).connect(volumeNode);

        this.players.set(name as StemType, player);
        this.volumes.set(name as StemType, volumeNode);
        this.stemVolumes.set(name as StemType, 1.0); // Default volume
      } catch (error) {
        console.error(`Fatal error loading ${name}:`, error);
        throw error;
      }
    });

    try {
      await Promise.all(loadPromises);
      await Tone.loaded();

      const firstPlayer = this.players.values().next().value;
      if (firstPlayer) {
        this.notifyStateChange({
          duration: firstPlayer.buffer.duration,
          currentTime: 0,
          stemVolumes: new Map(this.stemVolumes),
          masterVolume: 1.0,
        });
      }
    } catch (error) {
      console.error('Failed to load stems:', error);
      this.dispose();
      throw new Error('Failed to load one or more stems. Please try again.');
    }
  }

  private async cacheStemFromUrl(songId: string, stemName: string, url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await stemCache.cacheStem(songId, stemName, blob);
      console.log(`${stemName} stem cached for future use`);
    } catch (error) {
      console.error(`Failed to cache ${stemName}:`, error);
      // Don't throw - caching is optional
    }
  }

  async play(): Promise<void> {
    if (Tone.context.state === 'suspended') {
      await Tone.start();
    }

    // FIXED: Synchronize all players to start at the exact same time
    // Use Tone.now() + small offset to ensure samples align perfectly
    const startTime = Tone.now() + 0.1; // 100ms lookahead for buffer loading

    this.players.forEach(player => {
      if (!player.mute) {
        // Schedule all players to start at exact same time
        player.start(startTime);
      }
    });

    this.transport.start();
    this.startTimeTracking();
    this.notifyStateChange({ isPlaying: true });
  }

  pause(): void {
    this.players.forEach(player => player.stop());
    this.transport.pause();
    this.stopTimeTracking();
    this.notifyStateChange({ isPlaying: false });
  }

  stop(): void {
    this.players.forEach(player => player.stop());
    this.transport.stop();
    this.stopTimeTracking();
    this.seek(0);
    this.notifyStateChange({ isPlaying: false, currentTime: 0 });
  }

  async seek(time: number): Promise<void> {
    // FIXED: Proper async handling to prevent audio glitches
    const wasPlaying = this.transport.state === 'started';

    if (wasPlaying) {
      this.pause();
    }

    // Synchronize all player seeks
    this.players.forEach(player => {
      player.seek(time);
    });

    this.notifyStateChange({ currentTime: time });

    if (wasPlaying) {
      // Wait for seek to complete before restarting
      await new Promise(resolve => setTimeout(resolve, 10));
      await this.play();
    }
  }

  setSpeed(speed: number): void {
    this.players.forEach(player => {
      player.playbackRate = speed;
    });
    this.notifyStateChange({ playbackSpeed: speed });
  }

  soloStem(stemName: StemType | null): void {
    if (stemName === null) {
      this.players.forEach(player => {
        player.mute = false;
      });
    } else {
      this.players.forEach((player, name) => {
        player.mute = name !== stemName;
      });
    }
    this.notifyStateChange({ soloStem: stemName });
  }

  muteStem(stemName: StemType): void {
    const player = this.players.get(stemName);
    if (player) {
      player.mute = !player.mute;
    }
  }

  setLoop(start: number, end: number): void {
    this.players.forEach(player => {
      player.loop = true;
      player.loopStart = start;
      player.loopEnd = end;
    });

    // Set up crossfade monitoring for smooth loop transitions
    this.setupLoopCrossfade(end);

    this.notifyStateChange({
      loopEnabled: true,
      loopStart: start,
      loopEnd: end,
    });
  }

  private setupLoopCrossfade(end: number): void {
    // Clear any existing loop check
    if (this.loopCheckInterval) {
      window.clearInterval(this.loopCheckInterval);
    }

    // Monitor playback and apply crossfade when approaching loop point
    this.loopCheckInterval = window.setInterval(() => {
      const firstPlayer = this.players.values().next().value;
      if (!firstPlayer || firstPlayer.state !== 'started') return;

      const currentTime = firstPlayer.immediate();
      const timeUntilLoop = end - currentTime;

      // If we're within crossfade duration of the loop point, prepare crossfade
      if (timeUntilLoop > 0 && timeUntilLoop <= this.crossfadeDuration) {
        this.applyCrossfade(timeUntilLoop);
      }
    }, 10); // Check every 10ms
  }

  private applyCrossfade(timeRemaining: number): void {
    const fadeOutProgress = 1 - (timeRemaining / this.crossfadeDuration);

    // Apply subtle volume dip for smooth transition
    this.volumes.forEach(volume => {
      const currentVolume = volume.volume.value;
      const fadeMultiplier = 1 - (fadeOutProgress * 0.1); // Max 10% dip
      volume.volume.rampTo(currentVolume * fadeMultiplier, timeRemaining);
    });
  }

  setCrossfadeDuration(duration: number): void {
    this.crossfadeDuration = Math.max(0.01, Math.min(duration, 0.5)); // 10ms to 500ms
  }

  clearLoop(): void {
    this.players.forEach(player => {
      player.loop = false;
    });

    // Clear crossfade monitoring
    if (this.loopCheckInterval) {
      window.clearInterval(this.loopCheckInterval);
      this.loopCheckInterval = null;
    }

    this.notifyStateChange({
      loopEnabled: false,
      loopStart: null,
      loopEnd: null,
    });
  }

  setStemVolume(stemName: StemType, volume: number): void {
    const volumeNode = this.volumes.get(stemName);
    if (volumeNode) {
      // Convert 0-1 range to dB (-60 to 0)
      const dbValue = volume === 0 ? -Infinity : 20 * Math.log10(volume);
      volumeNode.volume.value = dbValue;
      this.stemVolumes.set(stemName, volume);
      this.notifyStateChange({ stemVolumes: new Map(this.stemVolumes) });
    }
  }

  setMasterVolume(volume: number): void {
    const dbValue = volume === 0 ? -Infinity : 20 * Math.log10(volume);
    this.masterVolume.volume.value = dbValue;
    this.notifyStateChange({ masterVolume: volume });
  }

  getStemVolume(stemName: StemType): number {
    return this.stemVolumes.get(stemName) ?? 1.0;
  }

  private startTimeTracking(): void {
    const updateTime = () => {
      const firstPlayer = this.players.values().next().value;
      if (firstPlayer && firstPlayer.state === 'started') {
        const currentTime = firstPlayer.immediate();
        this.notifyStateChange({ currentTime });
        this.animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    this.animationFrameId = requestAnimationFrame(updateTime);
  }

  private stopTimeTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  getMutedStems(): Set<StemType> {
    const muted = new Set<StemType>();
    this.players.forEach((player, name) => {
      if (player.mute) {
        muted.add(name);
      }
    });
    return muted;
  }

  dispose(): void {
    this.stopTimeTracking();
    if (this.loopCheckInterval) {
      window.clearInterval(this.loopCheckInterval);
      this.loopCheckInterval = null;
    }
    this.players.forEach(player => player.dispose());
    this.volumes.forEach(volume => volume.dispose());
    this.players.clear();
    this.volumes.clear();
    this.stemVolumes.clear();
  }
}
