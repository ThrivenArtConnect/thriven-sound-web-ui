import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FolderOpen, FileAudio, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadZone({ onUploadComplete, disabled }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setFiles(acceptedFiles);
    setUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    acceptedFiles.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('folderName', `Pack_${new Date().toISOString().split('T')[0]}`);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploading(false);
          setProgress(100);
          if (onUploadComplete) {
            onUploadComplete(response);
          }
        } else {
          throw new Error('Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Upload failed');
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/wav': ['.wav'],
      'audio/mpeg': ['.mp3'],
      'audio/mp4': ['.m4a'],
      'audio/flac': ['.flac'],
    },
    disabled: disabled || uploading,
    multiple: true,
  });

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        data-testid="upload-dropzone"
        className={`
          relative overflow-hidden cursor-pointer
          border-2 border-dashed transition-all duration-300
          ${isDragActive 
            ? 'border-primary bg-primary/10 shadow-glow-primary' 
            : 'border-white/20 hover:border-primary/50 bg-black/30'
          }
          ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''}
          p-8 md:p-12
        `}
      >
        <input {...getInputProps()} data-testid="upload-input" />
        
        {/* Animated scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4">
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-lg ${isDragActive ? 'bg-primary/20' : 'bg-white/5'}`}
          >
            {uploading ? (
              <FolderOpen className="w-12 h-12 text-primary animate-pulse" />
            ) : (
              <Upload className="w-12 h-12 text-primary" />
            )}
          </motion.div>

          <div>
            <h3 className="font-heading text-xl font-bold text-white uppercase tracking-wider">
              {isDragActive ? 'Drop Files Here' : 'Data Upload Terminal'}
            </h3>
            <p className="mt-2 text-gray-400 font-body">
              {uploading 
                ? `Uploading ${files.length} file(s)...`
                : 'Drag & drop audio files (WAV, MP3, M4A, FLAC) or click to browse'
              }
            </p>
          </div>

          {/* Progress bar */}
          <AnimatePresence>
            {uploading && (
              <motion.div
                initial={{ opacity: 0, width: '0%' }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0 }}
                className="w-full max-w-md"
              >
                <div className="cyber-progress">
                  <motion.div
                    className="cyber-progress-bar"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="mt-2 text-sm font-mono text-primary">
                  {progress}% uploaded
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* File list preview */}
          <AnimatePresence>
            {files.length > 0 && !uploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-md mt-4"
              >
                <div className="bg-black/40 border border-white/10 p-4 max-h-40 overflow-y-auto">
                  {files.slice(0, 5).map((file, i) => (
                    <div key={i} className="flex items-center justify-between py-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <FileAudio className="w-4 h-4 text-primary" />
                        <span className="truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <span className="text-gray-500 font-mono">{formatSize(file.size)}</span>
                    </div>
                  ))}
                  {files.length > 5 && (
                    <p className="text-gray-500 text-sm mt-2">
                      +{files.length - 5} more files
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported formats */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {['WAV', 'MP3', 'M4A', 'FLAC'].map((format) => (
              <span
                key={format}
                className="px-2 py-1 text-xs font-mono bg-white/5 border border-white/10 text-gray-400"
              >
                .{format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 bg-error/10 border border-error/30 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <p className="text-error text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
