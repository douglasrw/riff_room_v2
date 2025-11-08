import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';
import { useStemProcessor } from '../../hooks/useStemProcessor';

export const DragDropZone = () => {
  const { processSong, isProcessing, progress } = useStemProcessor();

  const onDrop = useCallback(async (files: File[]) => {
    const audioFile = files[0];
    if (!audioFile) return;

    // Validate file type
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
    const isValid = validTypes.includes(audioFile.type) ||
                   /\.(mp3|wav|m4a)$/i.test(audioFile.name);

    if (!isValid) {
      console.error('Unsupported file type:', audioFile.type);
      return;
    }

    // Start processing
    await processSong(audioFile);
  }, [processSong]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/x-m4a': ['.m4a'],
    },
    maxFiles: 1,
    disabled: isProcessing,
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
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      {isProcessing ? (
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
