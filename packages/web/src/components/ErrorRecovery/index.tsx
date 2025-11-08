/**
 * Error recovery component.
 *
 * Provides user-friendly error messages and recovery actions for common failures:
 * - Backend crashes (show retry with server check)
 * - Network issues (auto-reconnect guidance)
 * - Corrupted audio (clear error with upload suggestions)
 * - Disk space issues (cleanup suggestions)
 */

export type ErrorType =
  | 'backend_crash'
  | 'network_error'
  | 'corrupted_audio'
  | 'disk_space'
  | 'timeout'
  | 'generic';

export interface ErrorRecoveryProps {
  type: ErrorType;
  message?: string;
  onRetry?: () => void | Promise<void>;
  onDismiss?: () => void;
  details?: string;
}

interface ErrorConfig {
  icon: string;
  title: string;
  description: string;
  actions: Array<{
    label: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  tips?: string[];
}

const getErrorConfig = (
  type: ErrorType,
  onRetry?: () => void | Promise<void>,
  onDismiss?: () => void
): ErrorConfig => {
  const configs: Record<ErrorType, ErrorConfig> = {
    backend_crash: {
      icon: '🔄',
      title: 'Server Connection Lost',
      description:
        'The backend server appears to be offline or crashed. This can happen if the server process was stopped.',
      actions: [
        {
          label: 'Retry Connection',
          onClick: onRetry,
          variant: 'primary',
        },
        {
          label: 'Check Server Status',
          onClick: () => {
            window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8007'}/health`, '_blank');
          },
          variant: 'secondary',
        },
      ],
      tips: [
        'Make sure the backend server is running: ./scripts/start-backend.sh',
        'Check if port 8007 is in use by another process',
        'Look for error messages in the server console',
      ],
    },

    network_error: {
      icon: '📡',
      title: 'Network Connection Error',
      description:
        'Unable to reach the server. Check your internet connection and firewall settings.',
      actions: [
        {
          label: 'Retry',
          onClick: onRetry,
          variant: 'primary',
        },
        {
          label: 'Dismiss',
          onClick: onDismiss,
          variant: 'secondary',
        },
      ],
      tips: [
        'Check that you are connected to the internet',
        'Verify the backend server is accessible',
        'Try disabling VPN or proxy if enabled',
      ],
    },

    corrupted_audio: {
      icon: '🎵',
      title: 'Audio File Error',
      description:
        'The audio file appears to be corrupted or in an unsupported format. Please try a different file.',
      actions: [
        {
          label: 'Upload Different File',
          onClick: () => {
            onDismiss?.();
            // Trigger file picker
            document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
          },
          variant: 'primary',
        },
        {
          label: 'Dismiss',
          onClick: onDismiss,
          variant: 'secondary',
        },
      ],
      tips: [
        'Supported formats: MP3, WAV, M4A',
        'Try converting the file to MP3 with a tool like Audacity',
        'Ensure the file is not DRM-protected',
        'Maximum file size: 200MB',
      ],
    },

    disk_space: {
      icon: '💾',
      title: 'Insufficient Disk Space',
      description:
        'There is not enough disk space to process this file. Free up space and try again.',
      actions: [
        {
          label: 'Open Cache Directory',
          onClick: () => {
            // This would need to be implemented in Electron main process
            console.log('Opening cache directory: ~/.riffroom/stems');
          },
          variant: 'primary',
        },
        {
          label: 'Clear Old Stems',
          onClick: async () => {
            // This would call an API to clean up old cached stems
            console.log('Clearing old stems...');
            onRetry?.();
          },
          variant: 'secondary',
        },
      ],
      tips: [
        'Cached stems are stored in: ~/.riffroom/stems',
        'Each song takes approximately 200-300MB of space',
        'You can safely delete old stem files manually',
        'Consider moving the cache directory to a larger drive',
      ],
    },

    timeout: {
      icon: '⏱️',
      title: 'Request Timed Out',
      description:
        'The request took too long to complete. This may be due to a slow connection or server overload.',
      actions: [
        {
          label: 'Try Again',
          onClick: onRetry,
          variant: 'primary',
        },
        {
          label: 'Dismiss',
          onClick: onDismiss,
          variant: 'secondary',
        },
      ],
      tips: [
        'Stem separation can take 20-60 seconds for a 3-minute song',
        'Check your internet connection speed',
        'Try with a shorter audio file first',
      ],
    },

    generic: {
      icon: '⚠️',
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try again.',
      actions: [
        {
          label: 'Retry',
          onClick: onRetry,
          variant: 'primary',
        },
        {
          label: 'Reload App',
          onClick: () => window.location.reload(),
          variant: 'secondary',
        },
      ],
      tips: ['If the problem persists, try restarting the application'],
    },
  };

  return configs[type];
};

export const ErrorRecovery = ({
  type,
  message,
  onRetry,
  onDismiss,
  details,
}: ErrorRecoveryProps): JSX.Element => {
  const config = getErrorConfig(type, onRetry, onDismiss);

  return (
    <div
      className="space-y-6 max-w-2xl mx-auto p-6"
      role="alert"
      aria-live="assertive"
      data-testid={`error-recovery-${type}`}
    >
      {/* Icon and Title */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20">
          <span className="text-4xl" aria-hidden="true">
            {config.icon}
          </span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{config.title}</h2>
          <p className="text-gray-400 mt-2">{message || config.description}</p>
        </div>
      </div>

      {/* Details (if provided) */}
      {details && (
        <details className="bg-gray-800/50 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs text-red-400 font-mono whitespace-pre-wrap break-words">
            {details}
          </pre>
        </details>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        {config.actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              px-6 py-3 rounded-lg font-medium transition-all
              ${
                action.variant === 'primary'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }
            `}
            disabled={!action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Tips */}
      {config.tips && config.tips.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">💡 Tips:</h3>
          <ul className="space-y-1 text-sm text-gray-400">
            {config.tips.map((tip, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-gray-600">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
