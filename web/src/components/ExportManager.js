import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Package, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  FileArchive,
  FileText,
  ExternalLink
} from 'lucide-react';

export default function ExportManager({ uploadId, availableDirs = {} }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [report, setReport] = useState(null);
  const [manifest, setManifest] = useState(null);

  const exportTopN = async (topN = 10) => {
    setLoading('export');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, action: 'export-top', topN }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReport(data.report);
      setSuccess(`Exported top ${topN} files!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const prepBR864 = async (padToLongest = false) => {
    setLoading('br864');
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/stemmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, action: 'prep-br864', padToLongest }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setManifest(data.manifest);
      setSuccess('BR-864 files prepared!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const downloadZip = async (exportType) => {
    setLoading(exportType);
    setError(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, action: 'download', exportType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      // Trigger download
      window.open(data.downloadPath, '_blank');
      setSuccess(`${exportType}.zip ready for download!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const exportOptions = [
    {
      id: 'exports',
      name: 'Top N Export',
      description: 'Ranked best files with reports',
      icon: Package,
      available: availableDirs.exports,
      action: () => downloadZip('exports'),
      prepAction: () => exportTopN(10),
    },
    {
      id: 'stems_8',
      name: '8-Stem Pack',
      description: 'Organized stems for Ableton',
      icon: FileArchive,
      available: availableDirs.stems_8,
      action: () => downloadZip('stems_8'),
    },
    {
      id: 'br864_ready',
      name: 'BR-864 Ready',
      description: '44.1kHz 16-bit WAV files',
      icon: FileArchive,
      available: availableDirs.br864_ready,
      action: () => downloadZip('br864_ready'),
      prepAction: () => prepBR864(true),
    },
  ];

  if (!uploadId) {
    return (
      <div className="cyber-card p-8 text-center">
        <Download className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Upload and analyze files first to access exports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="export-manager">
      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-error/10 border border-error/30 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-error" />
            <p className="text-error text-sm">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-success/10 border border-success/30 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-success text-sm">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exportOptions.map((opt) => (
          <div key={opt.id} className="cyber-card p-6" data-testid={`export-option-${opt.id}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 ${opt.available ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-500'}`}>
                <opt.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-white uppercase tracking-wider">
                  {opt.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">{opt.description}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {opt.prepAction && !opt.available && (
                <button
                  onClick={opt.prepAction}
                  disabled={loading === opt.id}
                  data-testid={`prepare-${opt.id}-btn`}
                  className="cyber-btn w-full flex items-center justify-center gap-2"
                >
                  {loading === opt.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  Prepare
                </button>
              )}
              
              <button
                onClick={opt.action}
                disabled={loading === opt.id || !opt.available}
                data-testid={`download-${opt.id}-btn`}
                className={`w-full flex items-center justify-center gap-2 ${
                  opt.available 
                    ? 'cyber-btn' 
                    : 'px-4 py-3 bg-white/5 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading === opt.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download ZIP
              </button>

              {!opt.available && (
                <p className="text-xs text-gray-500 text-center">
                  Not yet generated
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Report preview */}
      <AnimatePresence>
        {report && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cyber-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-bold text-white uppercase tracking-wider">
                Export Report
              </h3>
            </div>
            <pre className="bg-black/50 p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-96 border border-white/10">
              {report}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manifest preview */}
      <AnimatePresence>
        {manifest && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="cyber-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-secondary" />
              <h3 className="font-heading font-bold text-white uppercase tracking-wider">
                BR-864 Manifest
              </h3>
            </div>
            <pre className="bg-black/50 p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-96 border border-white/10">
              {manifest}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
