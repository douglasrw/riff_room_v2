import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useStemProcessor } from '../../hooks/useStemProcessor';
import { useAudioStore } from '../../stores/audioStore';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (matches backend limit)

export const DragDropZone = () => {
  // FIXED N4: Get error state to display to user
  const { processSong, isProcessing, progress, error: processingError } = useStemProcessor();
  // FIXED N6: Get audio loading state
  const isLoadingStems = useAudioStore((s) => s.isLoadingStems);
  const [validationError, setValidationError] = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const audioFile = files[0];
    if (!audioFile) return;

    // Clear previous validation errors
    setValidationError(null);

    // FIXED N2: Validate file size (prevents wasting network bandwidth)
    if (audioFile.size > MAX_FILE_SIZE) {
      setValidationError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    // Validate file type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    const isValid = validTypes.includes(audioFile.type) ||
                   /\.(mp3|wav|m4a)$/i.test(audioFile.name);

    if (!isValid) {
      setValidationError('Unsupported file type. Please use MP3, WAV, or M4A');
      return;
    }

    // Start processing
    await processSong(audioFile);
  }, [processSong]);

  // Use validation error if present, otherwise processing error
  const error = validationError || processingError;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/x-m4a': ['.m4a'],
    },
    maxFiles: 1,
    // FIXED N6: Also disable during audio loading
    disabled: isProcessing || isLoadingStems,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-lg p-12 text-center
        transition-all duration-200 cursor-pointer
        ${isDragActive
          ? 'border-indigo-500 bg-indigo-500/10 scale-105'
          : 'border-gray-600 hover:border-indigo-400 hover:bg-indigo-400/5'
        }
        ${isProcessing || isLoadingStems ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      {/* FIXED N6: Show audio loading state */}
      {isLoadingStems ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Loading audio...</p>
            <p className="text-sm text-gray-400">Preparing stems for playback</p>
          </div>
        </div>
      ) : /* FIXED N4: Display error message to user */ error ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-red-500/20 rounded-full">
              <span className="text-4xl">⚠️</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-red-400">
              {validationError ? 'Invalid File' : 'Processing Failed'}
            </p>
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={() => {
                setValidationError(null);
                // For processing errors, reload is safer
                if (processingError) {
                  window.location.reload();
                }
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : isProcessing ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Processing your song...</p>
            <p className="text-sm text-gray-400">This may take up to 30 seconds</p>
            <div className="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{Math.round(progress)}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-indigo-500/20 rounded-full">
              <Upload className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop your song here' : 'Drag & drop your song'}
            </p>
            <p className="text-sm text-gray-400">
              or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports MP3, WAV, M4A
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
