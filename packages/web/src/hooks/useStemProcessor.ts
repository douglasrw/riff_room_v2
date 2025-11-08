import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { WebSocketService } from '../services/websocket';
import { storeProcessingSession, getProcessingSession, clearProcessingSession } from '../services/storage';

interface StemProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  canResume: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8007';

export const useStemProcessor = () => {
  const [state, setState] = useState<StemProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    canResume: false,
  });

  const loadSong = useAudioStore((s) => s.loadSong);
  const wsRef = useRef<WebSocketService | null>(null);
  const stemUrlsRef = useRef<string[]>([]);
  const currentFileRef = useRef<string | null>(null);

  // FIXED N5: Check for resumable session on mount
  useEffect(() => {
    const session = getProcessingSession();
    if (session) {
      setState(prev => ({ ...prev, canResume: true }));
    }
  }, []);

  // FIXED N1: Cleanup object URLs and WebSocket on unmount
  useEffect(() => {
    return () => {
      // Revoke all created object URLs to prevent memory leak
      stemUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      stemUrlsRef.current = [];

      // Disconnect WebSocket
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, []);

  const processSong = useCallback(async (file: File) => {
    // FIXED H8: Prevent concurrent uploads causing memory leaks
    if (state.isProcessing) {
      console.warn('Processing already in progress, ignoring new upload');
      return;
    }

    setState({ isProcessing: true, progress: 0, error: null, canResume: false });

    try {
      // Cleanup previous session's blob URLs
      stemUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      stemUrlsRef.current = [];

      // Disconnect previous WebSocket if any
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }

      // FIXED N1: Actually call backend API instead of using mock data
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to backend
      const response = await fetch(`${API_URL}/api/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Upload failed');
      }

      const { client_id } = await response.json();

      // FIXED N5: Store client_id for resume capability
      storeProcessingSession(client_id);
      currentFileRef.current = file.name;

      // Connect to WebSocket for progress updates
      // FIXED N7: WebSocketService now reads from env var, no need to pass URL
      const ws = new WebSocketService(client_id);
      wsRef.current = ws;

      // Handle progress updates
      ws.onMessage((message) => {
        if (message.type === 'progress') {
          setState(prev => ({
            ...prev,
            progress: message.data.progress,
          }));
        } else if (message.type === 'complete') {
          // Processing complete, load stems
          const stemPaths = message.data.stems;

          // FIXED N3: Track URLs for cleanup
          const stemUrls = Object.values(stemPaths) as string[];
          stemUrlsRef.current = stemUrls;

          const song = {
            id: client_id,
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown Artist',
            stems: {
              drums: stemPaths.drums,
              bass: stemPaths.bass,
              other: stemPaths.other,
              vocals: stemPaths.vocals,
            },
          };

          setState({ isProcessing: false, progress: 100, error: null, canResume: false });
          loadSong(song);

          // FIXED N5: Clear processing session on success
          clearProcessingSession();

          // Cleanup WebSocket
          ws.disconnect();
          wsRef.current = null;

          // Reset progress
          setTimeout(() => {
            setState(prev => ({ ...prev, progress: 0 }));
          }, 500);
        } else if (message.type === 'error') {
          throw new Error(message.data.error || 'Processing failed');
        }
      });

      ws.onError(() => {
        // FIXED N5: Don't throw on WebSocket error - allow resume
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Connection lost. You can resume processing.',
          canResume: true,
        }));
      });

      ws.connect();

    } catch (error) {
      console.error('Stem processing error:', error);
      setState({
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to process song',
        canResume: false,
      });

      // FIXED H9: Use try/finally to ensure WebSocket cleanup even if clearProcessingSession throws
      try {
        // FIXED N5: Clear session on upload/API errors (not WebSocket errors)
        clearProcessingSession();
      } finally {
        // Cleanup on error - always runs even if clearProcessingSession throws
        if (wsRef.current) {
          wsRef.current.disconnect();
          wsRef.current = null;
        }
      }
    }
  }, [loadSong]);

  // FIXED N5: Resume processing from stored session
  const resumeProcessing = useCallback(() => {
    const session = getProcessingSession();
    if (!session) {
      setState(prev => ({
        ...prev,
        error: 'No session to resume',
        canResume: false,
      }));
      return;
    }

    setState({ isProcessing: true, progress: 0, error: null, canResume: false });

    try {
      // Reconnect to existing WebSocket session
      const ws = new WebSocketService(session.clientId);
      wsRef.current = ws;

      // Handle progress updates (same as processSong)
      ws.onMessage((message) => {
        if (message.type === 'progress') {
          setState(prev => ({
            ...prev,
            progress: message.data.progress,
          }));
        } else if (message.type === 'complete') {
          const stemPaths = message.data.stems;
          const stemUrls = Object.values(stemPaths) as string[];
          stemUrlsRef.current = stemUrls;

          const song = {
            id: session.clientId,
            title: currentFileRef.current || 'Resumed Song',
            artist: 'Unknown Artist',
            stems: {
              drums: stemPaths.drums,
              bass: stemPaths.bass,
              other: stemPaths.other,
              vocals: stemPaths.vocals,
            },
          };

          setState({ isProcessing: false, progress: 100, error: null, canResume: false });
          loadSong(song);
          clearProcessingSession();

          ws.disconnect();
          wsRef.current = null;

          setTimeout(() => {
            setState(prev => ({ ...prev, progress: 0 }));
          }, 500);
        } else if (message.type === 'error') {
          setState({
            isProcessing: false,
            progress: 0,
            error: message.data.error || 'Processing failed',
            canResume: false,
          });
          clearProcessingSession();
        }
      });

      ws.onError(() => {
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: 'Failed to reconnect',
          canResume: true,
        }));
      });

      ws.connect();
    } catch (error) {
      console.error('Resume error:', error);
      setState({
        isProcessing: false,
        progress: 0,
        error: 'Failed to resume processing',
        canResume: false,
      });
      clearProcessingSession();
    }
  }, [loadSong]);

  return {
    processSong,
    resumeProcessing,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
    canResume: state.canResume,
  };
};
