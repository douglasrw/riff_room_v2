import { useState, useCallback } from 'react';
import { useAudioStore } from '../stores/audioStore';

interface StemProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export const useStemProcessor = () => {
  const [state, setState] = useState<StemProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
  });

  const loadSong = useAudioStore((s) => s.loadSong);

  const processSong = useCallback(async (file: File) => {
    setState({ isProcessing: true, progress: 0, error: null });

    try {
      // TODO: Send to backend for processing when backend is ready
      // For now, simulate processing and use mock data

      // Simulate progress
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 300);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressInterval);

      // Create mock song with stems
      // In production, these URLs would come from the backend
      const mockSong = {
        id: `song-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        artist: 'Unknown Artist',
        stems: {
          drums: URL.createObjectURL(file), // Using original file as placeholder
          bass: URL.createObjectURL(file),
          other: URL.createObjectURL(file),
          vocals: URL.createObjectURL(file),
        },
      };

      setState({ isProcessing: false, progress: 100, error: null });

      // Load the song into the audio engine
      await loadSong(mockSong);

      // Reset progress after a brief delay
      setTimeout(() => {
        setState(prev => ({ ...prev, progress: 0 }));
      }, 500);

    } catch (error) {
      console.error('Stem processing error:', error);
      setState({
        isProcessing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to process song',
      });
    }
  }, [loadSong]);

  return {
    processSong,
    isProcessing: state.isProcessing,
    progress: state.progress,
    error: state.error,
  };
};
