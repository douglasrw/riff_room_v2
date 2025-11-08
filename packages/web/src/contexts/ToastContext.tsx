/**
 * Toast notification system for user feedback.
 *
 * Provides success, error, warning, and info notifications with auto-dismiss
 * and manual dismiss capabilities.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number, action?: Toast['action']) => string;
  dismissToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number, action?: Toast['action']) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps): JSX.Element => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = 'info',
      duration = 5000,
      action?: Toast['action']
    ): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const toast: Toast = {
        id,
        type,
        message,
        duration,
        action,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss after duration (unless duration is 0)
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, duration = 4000): string => {
      return showToast(message, 'success', duration);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration = 6000, action?: Toast['action']): string => {
      return showToast(message, 'error', duration, action);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration = 5000): string => {
      return showToast(message, 'warning', duration);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration = 4000): string => {
      return showToast(message, 'info', duration);
    },
    [showToast]
  );

  const value: ToastContextValue = {
    toasts,
    showToast,
    dismissToast,
    success,
    error,
    warning,
    info,
  };

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
