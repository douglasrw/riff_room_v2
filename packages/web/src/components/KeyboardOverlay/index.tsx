import { X } from 'lucide-react';
import { useAudioStore } from '../../stores/audioStore';
import { KEYBOARD_SHORTCUTS } from '../../hooks/useKeyboardShortcuts';

export const KeyboardOverlay = () => {
  const { showShortcuts, setShowShortcuts } = useAudioStore();

  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setShowShortcuts(false)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-6 space-y-6">
          {Object.entries(KEYBOARD_SHORTCUTS).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 bg-gray-700/50 rounded"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 bg-gray-900 rounded text-xs font-mono border border-gray-600"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 text-center">
          <p className="text-sm text-gray-400">
            Press <kbd className="px-2 py-1 bg-gray-900 rounded text-xs font-mono border border-gray-600">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};
