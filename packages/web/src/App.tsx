import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DragDropZone } from './components/DragDropZone';
import { WaveformDisplay } from './components/WaveformDisplay';
import { PlaybackControls } from './components/PlaybackControls';
import { StreakIndicator } from './components/StreakIndicator';
import { KeyboardOverlay } from './components/KeyboardOverlay';
import { ToastProvider } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useAudioStore } from './stores/audioStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  const { currentSong, setShowShortcuts } = useAudioStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup audio engine resources
      useAudioStore.getState()._engine.dispose();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            RiffRoom
          </h1>
          <StreakIndicator />
        </div>
        <button
          onClick={() => setShowShortcuts(true)}
          className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded hover:bg-gray-800"
        >
          Shortcuts <kbd className="ml-1 px-1.5 py-0.5 bg-gray-800 rounded text-xs">?</kbd>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar - Recent songs (placeholder for now) */}
        <aside className="w-64 border-r border-gray-800 p-4 bg-gray-900/50">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Recent Songs
          </h2>
          <div className="text-sm text-gray-500">
            {currentSong ? (
              <div className="p-2 bg-gray-800 rounded">
                <div className="font-medium text-white truncate">{currentSong.title}</div>
                <div className="text-xs text-gray-400 truncate">{currentSong.artist}</div>
              </div>
            ) : (
              <p>No songs yet</p>
            )}
          </div>
        </aside>

        {/* Practice Area */}
        <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
          {currentSong ? (
            <>
              {/* Waveform Display */}
              <WaveformDisplay />

              {/* Playback Controls */}
              <PlaybackControls />

              {/* Instructions */}
              <div className="text-center text-sm text-gray-500 pt-4">
                Use keyboard shortcuts for faster practice. Press{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">?</kbd>{' '}
                to see all shortcuts.
              </div>
            </>
          ) : (
            // Drag & Drop Zone when no song is loaded
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md w-full">
                <DragDropZone />
                <div className="mt-6 text-center space-y-2">
                  <h2 className="text-xl font-semibold">Start Practicing</h2>
                  <p className="text-sm text-gray-400">
                    Drop your song to separate stems and start practicing
                  </p>
                  <div className="pt-4 space-y-1 text-xs text-gray-500">
                    <p>✓ Isolate any instrument</p>
                    <p>✓ Slow down without pitch change</p>
                    <p>✓ Loop difficult sections</p>
                    <p>✓ Track your practice streak</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Keyboard Overlay */}
      <KeyboardOverlay />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

// FIXED M1: Wrap app with ErrorBoundary to prevent full crashes
// FIXED bd-t0c: Add ToastProvider for global error notifications
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
