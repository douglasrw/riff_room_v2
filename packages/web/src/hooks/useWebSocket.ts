/**
 * React hook for WebSocket connection management
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WebSocketService,
  WebSocketMessage,
  ProgressData,
} from '@/services/websocket';

export interface UseWebSocketOptions {
  clientId: string;
  baseUrl?: string;
  autoConnect?: boolean;
  onProgress?: (data: ProgressData) => void;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (data: any) => void;
  lastMessage: WebSocketMessage | null;
}

/**
 * Hook for managing WebSocket connections
 */
export function useWebSocket({
  clientId,
  baseUrl,
  autoConnect = true,
  onProgress,
  onComplete,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    wsRef.current = new WebSocketService(clientId, baseUrl);

    // Set up message handler
    const unsubscribeMessage = wsRef.current.onMessage((message) => {
      setLastMessage(message);

      switch (message.type) {
        case 'progress':
          onProgress?.(message.data as ProgressData);
          break;
        case 'complete':
          onComplete?.(message.data);
          break;
        case 'error':
          onError?.(message.data);
          break;
      }
    });

    // Set up close handler
    const unsubscribeClose = wsRef.current.onClose(() => {
      setIsConnected(false);
    });

    // Set up error handler
    const unsubscribeError = wsRef.current.onError((error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });

    // FIXED: Track connection state via onopen event instead of polling
    let checkConnectionInterval: number | undefined;
    const ws = wsRef.current;
    const originalConnect = ws.connect.bind(ws);
    ws.connect = () => {
      originalConnect();
      // Update connection state when WebSocket opens
      checkConnectionInterval = window.setInterval(() => {
        if (wsRef.current?.isConnected) {
          setIsConnected(true);
          if (checkConnectionInterval) {
            clearInterval(checkConnectionInterval);
            checkConnectionInterval = undefined;
          }
        }
      }, 50); // Quick check until connected, then stop
    };

    // Auto-connect if enabled
    if (autoConnect) {
      ws.connect();
    }

    // Cleanup
    return () => {
      // FIXED: Clear connection check interval to prevent memory leak
      if (checkConnectionInterval) {
        clearInterval(checkConnectionInterval);
      }
      unsubscribeMessage();
      unsubscribeClose();
      unsubscribeError();
      wsRef.current?.disconnect();
    };
    // FIXED: Include callback deps to prevent stale closures
  }, [clientId, baseUrl, autoConnect, onProgress, onComplete, onError]);

  // Connect function
  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  // Send function
  const send = useCallback((data: any) => {
    wsRef.current?.send(data);
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    send,
    lastMessage,
  };
}

/**
 * Hook specifically for stem processing progress
 */
export function useStemProcessingProgress(clientId: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, connect, disconnect } = useWebSocket({
    clientId,
    autoConnect: false,
    onProgress: (data) => {
      setProgress(data.progress);
      setStatus(data.status);
      setIsProcessing(true);
    },
    onComplete: (data) => {
      setResult(data);
      setIsProcessing(false);
      setProgress(100);
      setStatus('Complete');
    },
    onError: (errorData) => {
      setError(errorData.error || 'Unknown error');
      setIsProcessing(false);
    },
  });

  const startProcessing = useCallback(() => {
    setProgress(0);
    setStatus('Starting...');
    setIsProcessing(true);
    setResult(null);
    setError(null);
    connect();
  }, [connect]);

  const reset = useCallback(() => {
    setProgress(0);
    setStatus('');
    setIsProcessing(false);
    setResult(null);
    setError(null);
    disconnect();
  }, [disconnect]);

  return {
    progress,
    status,
    isProcessing,
    result,
    error,
    isConnected,
    startProcessing,
    reset,
  };
}
