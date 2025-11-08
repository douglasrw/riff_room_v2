/**
 * Offline indicator component.
 *
 * Shows a banner when the device is offline, with helpful guidance.
 */

import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useToast } from '../../contexts/ToastContext';
import { useEffect, useRef } from 'react';

export const OfflineIndicator = (): JSX.Element | null => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { success, warning } = useToast();
  const hasShownOfflineToast = useRef(false);
  const hasShownOnlineToast = useRef(false);

  useEffect(() => {
    if (!isOnline && !hasShownOfflineToast.current) {
      warning('You are offline. Some features may not work.', 0); // Don't auto-dismiss
      hasShownOfflineToast.current = true;
      hasShownOnlineToast.current = false;
    }

    if (wasOffline && !hasShownOnlineToast.current) {
      success('Back online! You can continue working.');
      hasShownOnlineToast.current = true;
      hasShownOfflineToast.current = false;
    }
  }, [isOnline, wasOffline, warning, success]);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/90 text-white px-4 py-3 shadow-lg"
      role="alert"
      data-testid="offline-indicator"
    >
      <div className="flex items-center justify-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
            />
          </svg>
        </div>
        <div className="flex-1 text-center">
          <p className="font-semibold">No internet connection</p>
          <p className="text-sm opacity-90">
            Check your network settings and try again. Some features are unavailable offline.
          </p>
        </div>
      </div>
    </div>
  );
};
