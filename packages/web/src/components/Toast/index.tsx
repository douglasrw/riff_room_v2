/**
 * Toast notification component.
 *
 * Displays toast notifications in bottom-right corner with animations.
 */

import { useState } from 'react';
import { useToast, Toast as ToastType } from '../../contexts/ToastContext';

const ICON_MAP = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLOR_MAP = {
  success: 'bg-green-500/90',
  error: 'bg-red-500/90',
  warning: 'bg-yellow-500/90',
  info: 'bg-blue-500/90',
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const ToastItem = ({ toast, onDismiss }: ToastItemProps): JSX.Element => {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = (): void => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Match animation duration
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        ${COLOR_MAP[toast.type]}
        text-white font-medium
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      data-testid={`toast-${toast.type}`}
    >
      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white/20 rounded-full">
        <span className="text-lg">{ICON_MAP[toast.type]}</span>
      </div>

      <div className="flex-1 text-sm">{toast.message}</div>

      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            handleDismiss();
          }}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold transition-colors"
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </div>
  );
};

export const ToastContainer = (): JSX.Element => {
  const { toasts, dismissToast } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
};
