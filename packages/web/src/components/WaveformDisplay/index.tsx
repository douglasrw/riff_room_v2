import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { useAudioStore } from '../../stores/audioStore';

export const WaveformDisplay = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);

  const { currentSong, loopStart, loopEnd, currentTime, duration } = useAudioStore();

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !currentSong) return;

    // Cleanup previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4F46E5',
      progressColor: '#818CF8',
      cursorColor: '#F3F4F6',
      barWidth: 2,
      barGap: 1,
      height: 128,
      normalize: true,
    });

    // Add regions plugin for loop markers
    const regions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;

    // Load audio (use first stem - drums - for waveform visualization)
    if (currentSong.stems.drums) {
      ws.load(currentSong.stems.drums);
    }

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [currentSong]);

  // Update loop regions when loop points change
  useEffect(() => {
    if (!regionsRef.current) return;

    // Clear existing regions
    regionsRef.current.clearRegions();

    // Add loop region if both points are set
    if (loopStart !== null && loopEnd !== null) {
      regionsRef.current.addRegion({
        start: loopStart,
        end: loopEnd,
        color: 'rgba(79, 70, 229, 0.2)',
        drag: false,
        resize: false,
      });
    }
  }, [loopStart, loopEnd]);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className="relative bg-gray-800 p-4 rounded-lg" data-testid="waveform-display">
      {/* Waveform container */}
      <div ref={containerRef} className="w-full" />

      {/* Time indicators */}
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span className="text-gray-500">{currentSong.title}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Loop indicators */}
      {(loopStart !== null || loopEnd !== null) && (
        <div className="mt-2 flex gap-2 text-xs text-indigo-400">
          {loopStart !== null && (
            <span>Loop start: {formatTime(loopStart)}</span>
          )}
          {loopEnd !== null && (
            <span>Loop end: {formatTime(loopEnd)}</span>
          )}
        </div>
      )}
    </div>
  );
};
