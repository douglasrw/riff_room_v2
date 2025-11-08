import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioStore } from '../stores/audioStore';
import { WebSocketService } from '../services/websocket';

interface StemProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8007';

export const useStemProcessor = () => {
  const [state, setState] = useState<StemProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });

  const loadSong = useAudioStore((s) => s.loadSong);
  const wsRef = useRef<WebSocketService | null>(null);
  const stemUrlsRef = useRef<string[]>([]);

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
    setState({ isProcessing: true, progress: 0, error: null });

    try {
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

      // Connect to WebSocket for progress updates
      const ws = new WebSocketService(client_id, API_URL.replace('http', 'ws'));
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

          setState({ isProcessing: false, progress: 100, error: null });
          loadSong(song);

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
        throw new Error('WebSocket connection failed');
      });

      ws.connect();

    } catch (error) {
      console.error('Stem processing error:', error);
      setState({
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to process song',
      });

      // Cleanup on error
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    }
  }, [loadSong]);

  return {
    processSong,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
  };
};
