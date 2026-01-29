import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle,
  Copy,
  FileAudio
} from 'lucide-react';
import WaveformPlayer from './WaveformPlayer';

export default function AnalysisDashboard({ data, uploadId, duplicates = [] }) {
  const [sortConfig, setSortConfig] = useState({ key: 'filename', direction: 'asc' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const files = data?.files || [];

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      let aVal, bVal;

      switch (sortConfig.key) {
        case 'filename':
          aVal = a.filename || '';
          bVal = b.filename || '';
          break;
        case 'lufs':
          aVal = a.audio_analysis?.loudness_lufs ?? -Infinity;
          bVal = b.audio_analysis?.loudness_lufs ?? -Infinity;
          break;
        case 'peak':
          aVal = a.audio_analysis?.peak_db ?? -Infinity;
          bVal = b.audio_analysis?.peak_db ?? -Infinity;
          break;
        case 'rms':
          aVal = a.audio_analysis?.rms_db ?? -Infinity;
          bVal = b.audio_analysis?.rms_db ?? -Infinity;
          break;
        case 'silence':
          aVal = a.audio_analysis?.silence_percent ?? Infinity;
          bVal = b.audio_analysis?.silence_percent ?? Infinity;
          break;
        case 'duration':
          aVal = a.duration_sec ?? 0;
          bVal = b.duration_sec ?? 0;
          break;
        case 'loopability':
          aVal = a.audio_analysis?.loopability_heuristic ?? 0;
          bVal = b.audio_analysis?.loopability_heuristic ?? 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [files, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const formatNumber = (num, decimals = 1) => {
    if (num === null || num === undefined || !Number.isFinite(num)) return '—';
    return num.toFixed(decimals);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const getLoopabilityColor = (value) => {
    if (value >= 0.8) return 'text-success';
    if (value >= 0.5) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="space-y-6" data-testid="analysis-dashboard">
      {/* Stats header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-primary">{files.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Files</p>
        </div>
        <div className="cyber-card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-secondary">{duplicates.length}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Duplicates</p>
        </div>
        <div className="cyber-card p-4 text-center">
          <p className="font-heading text-2xl font-bold gradient-text">
            {formatNumber(files.reduce((sum, f) => sum + (f.audio_analysis?.loopability_heuristic || 0), 0) / files.length * 100, 0)}%
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Loopability</p>
        </div>
        <div className="cyber-card p-4 text-center">
          <p className="font-heading text-2xl font-bold text-white">
            {formatNumber(files.reduce((sum, f) => sum + (f.duration_sec || 0), 0) / 60, 1)} min
          </p>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Total Duration</p>
        </div>
      </div>

      {/* Duplicate warning */}
      <AnimatePresence>
        {duplicates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cyber-card p-4 border-warning/30"
          >
            <button
              onClick={() => setShowDuplicates(!showDuplicates)}
              data-testid="show-duplicates-btn"
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="font-heading font-bold text-warning uppercase">
                  {duplicates.length} Duplicate Group(s) Detected (SHA-256)
                </span>
              </div>
              {showDuplicates ? <ChevronUp className="w-5 h-5 text-warning" /> : <ChevronDown className="w-5 h-5 text-warning" />}
            </button>
            
            <AnimatePresence>
              {showDuplicates && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-2"
                >
                  {duplicates.map((dupe, i) => (
                    <div key={i} className="bg-black/30 p-3 border border-warning/20">
                      <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-2">
                        <Copy className="w-3 h-3" />
                        <span className="truncate">{dupe.hash}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dupe.files.map((fileId, j) => {
                          const file = files.find(f => f.id === fileId);
                          return (
                            <span key={j} className="px-2 py-1 text-xs bg-warning/10 text-warning border border-warning/20">
                              {file?.filename || fileId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waveform preview for selected file */}
      <AnimatePresence>
        {selectedFile && uploadId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <WaveformPlayer
              audioUrl={`/api/audio?uploadId=${uploadId}&filename=${encodeURIComponent(selectedFile.filename)}`}
              filename={selectedFile.filename}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="cyber-table" data-testid="analysis-table">
            <thead>
              <tr className="bg-black/40">
                <th onClick={() => handleSort('filename')} className="min-w-[200px]">
                  Filename <SortIcon column="filename" />
                </th>
                <th onClick={() => handleSort('duration')} className="text-right">
                  Duration <SortIcon column="duration" />
                </th>
                <th onClick={() => handleSort('lufs')} className="text-right">
                  LUFS <SortIcon column="lufs" />
                </th>
                <th onClick={() => handleSort('peak')} className="text-right">
                  Peak dB <SortIcon column="peak" />
                </th>
                <th onClick={() => handleSort('rms')} className="text-right">
                  RMS dB <SortIcon column="rms" />
                </th>
                <th onClick={() => handleSort('silence')} className="text-right">
                  Silence % <SortIcon column="silence" />
                </th>
                <th onClick={() => handleSort('loopability')} className="text-right">
                  Loop Score <SortIcon column="loopability" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file, index) => (
                <motion.tr
                  key={file.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedFile(selectedFile?.id === file.id ? null : file)}
                  data-testid={`analysis-row-${index}`}
                  className={`cursor-pointer transition-colors ${
                    selectedFile?.id === file.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <td>
                    <div className="flex items-center gap-2">
                      <FileAudio className={`w-4 h-4 flex-shrink-0 ${
                        selectedFile?.id === file.id ? 'text-primary' : 'text-gray-500'
                      }`} />
                      <span className="truncate max-w-[180px]" title={file.filename}>
                        {file.filename}
                      </span>
                    </div>
                  </td>
                  <td className="text-right">{formatDuration(file.duration_sec)}</td>
                  <td className="text-right">{formatNumber(file.audio_analysis?.loudness_lufs)}</td>
                  <td className="text-right">{formatNumber(file.audio_analysis?.peak_db)}</td>
                  <td className="text-right">{formatNumber(file.audio_analysis?.rms_db)}</td>
                  <td className="text-right">{formatNumber(file.audio_analysis?.silence_percent)}</td>
                  <td className={`text-right font-bold ${getLoopabilityColor(file.audio_analysis?.loopability_heuristic || 0)}`}>
                    {formatNumber((file.audio_analysis?.loopability_heuristic || 0) * 100, 0)}%
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {files.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No analysis data available. Run the pipeline first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
