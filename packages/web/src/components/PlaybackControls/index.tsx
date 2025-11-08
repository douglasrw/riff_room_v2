import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useAudioStore } from '../../stores/audioStore';
import type { StemType } from '../../services/audioEngine';

export const PlaybackControls = () => {
  const {
    isPlaying,
    playbackSpeed,
    mutedStems,
    activeSoloStem,
    isLoadingStems,
    togglePlay,
    setSpeed,
    setSoloStem,
    toggleStemMute,
    skipBackward,
    skipForward,
  } = useAudioStore();

  const stems: { type: StemType; label: string; color: string }[] = [
    { type: 'drums', label: 'Drums', color: 'bg-red-500' },
    { type: 'bass', label: 'Bass', color: 'bg-blue-500' },
    { type: 'other', label: 'Other', color: 'bg-green-500' },
    { type: 'vocals', label: 'Vocals', color: 'bg-purple-500' },
  ];

  const speeds = [0.7, 0.85, 1.0];

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-6">
      {/* Loading indicator */}
      {isLoadingStems && (
        <div className="text-center py-2">
          <div className="inline-flex items-center gap-2 text-indigo-400">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading stems...</span>
          </div>
        </div>
      )}

      {/* Main playback controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => skipBackward(5)}
          disabled={isLoadingStems}
          className="p-3 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Skip back 5s"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          disabled={isLoadingStems}
          data-testid={isPlaying ? 'pause-button' : 'play-button'}
          className="p-4 bg-indigo-500 hover:bg-indigo-600 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skipForward(5)}
          disabled={isLoadingStems}
          className="p-3 hover:bg-gray-700 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Skip forward 5s"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-400">Speed:</span>
        <div className="flex gap-1">
          {speeds.map((speed) => (
            <button
              key={speed}
              onClick={() => setSpeed(speed)}
              disabled={isLoadingStems}
              className={`
                px-3 py-1 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                ${playbackSpeed === speed
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
            >
              {Math.round(speed * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Stem controls */}
      <div className="space-y-3">
        <div className="text-sm text-gray-400 text-center">
          Stems (Click to solo, Shift+Click to mute)
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stems.map(({ type, label, color }) => {
            const isMuted = mutedStems.has(type);
            const isSolo = activeSoloStem === type;
            const isInactive = activeSoloStem !== null && !isSolo;

            return (
              <button
                key={type}
                data-testid={`stem-control-${type}`}
                onClick={(e) => {
                  if (e.shiftKey) {
                    toggleStemMute(type);
                  } else {
                    setSoloStem(isSolo ? null : type);
                  }
                }}
                disabled={isLoadingStems}
                className={`
                  relative p-3 rounded-lg transition-all disabled:cursor-not-allowed
                  ${isSolo ? `${color} text-white shadow-lg scale-105` : ''}
                  ${isMuted ? 'bg-gray-700/50 opacity-40' : ''}
                  ${!isSolo && !isMuted && !isInactive ? 'bg-gray-700 hover:bg-gray-600' : ''}
                  ${isInactive ? 'bg-gray-700/30 opacity-50' : ''}
                  ${isLoadingStems ? 'opacity-40' : ''}
                `}
                title={`${label} (1-4 to solo, Shift+1-4 to mute)`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{label}</span>
                  {isMuted && <VolumeX className="w-4 h-4" />}
                  {!isMuted && <Volume2 className="w-4 h-4" />}
                </div>
                {isSolo && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-center text-xs text-gray-500">
        Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">?</kbd> for keyboard shortcuts
      </div>
    </div>
  );
};
