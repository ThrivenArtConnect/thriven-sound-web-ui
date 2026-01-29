import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  BarChart3, 
  Music, 
  Download, 
  Waves,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

import UploadZone from '@/components/UploadZone';
import PipelineControl from '@/components/PipelineControl';
import AnalysisDashboard from '@/components/AnalysisDashboard';
import StemmapEditor from '@/components/StemmapEditor';
import ExportManager from '@/components/ExportManager';

const TABS = [
  { id: 'upload', name: 'Upload', icon: Upload },
  { id: 'pipeline', name: 'Pipeline', icon: Waves },
  { id: 'analysis', name: 'Analysis', icon: BarChart3 },
  { id: 'stemmap', name: '8-Stem', icon: Music },
  { id: 'export', name: 'Export', icon: Download },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [availableDirs, setAvailableDirs] = useState({});

  // Load upload data when uploadId changes
  useEffect(() => {
    if (uploadId) {
      loadUploadData();
    }
  }, [uploadId]);

  const loadUploadData = async () => {
    try {
      const response = await fetch(`/api/uploads?uploadId=${uploadId}`);
      const data = await response.json();
      if (data.success) {
        setUploadData(data.upload);
        setRawData(data.rawIndex);
        setAnalysisData(data.analysisIndex);
        setDuplicates(data.duplicates || []);
        setAvailableDirs(data.availableDirs || {});
      }
    } catch (err) {
      console.error('Failed to load upload data:', err);
    }
  };

  const handleUploadComplete = (data) => {
    setUploadId(data.uploadId);
    setUploadData(data);
    setActiveTab('pipeline');
  };

  const handlePipelineStepComplete = (step, data) => {
    if (step === 'scan') {
      setRawData(data.rawIndex);
      setDuplicates(data.duplicates || []);
    } else if (step === 'analyze') {
      setAnalysisData(data.analysisIndex);
      setActiveTab('analysis');
    }
    // Refresh available dirs
    loadUploadData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <UploadZone onUploadComplete={handleUploadComplete} />
            
            {uploadData && (
              <div className="cyber-card p-4">
                <h3 className="font-heading text-sm text-primary uppercase mb-2">Current Upload</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Folder:</span>
                    <p className="font-mono text-white">{uploadData.folderName || uploadData.folder_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Files:</span>
                    <p className="font-mono text-white">{uploadData.fileCount || uploadData.file_count}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <p className="font-mono text-white">
                      {((uploadData.totalSize || uploadData.total_size_bytes) / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-mono text-primary">{uploadData.status || 'Ready'}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        );

      case 'pipeline':
        return (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PipelineControl
              uploadId={uploadId}
              onStepComplete={handlePipelineStepComplete}
            />
          </motion.div>
        );

      case 'analysis':
        return (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AnalysisDashboard
              data={analysisData}
              uploadId={uploadId}
              duplicates={duplicates}
            />
          </motion.div>
        );

      case 'stemmap':
        return (
          <motion.div
            key="stemmap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <StemmapEditor uploadId={uploadId} />
          </motion.div>
        );

      case 'export':
        return (
          <motion.div
            key="export"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ExportManager uploadId={uploadId} availableDirs={availableDirs} />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background-base/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <h1 
                className="font-heading font-black text-2xl md:text-3xl tracking-[0.1em] gradient-text"
                data-testid="app-logo"
              >
                THRIVEN
              </h1>
              <span className="hidden md:block px-2 py-1 text-xs font-mono bg-primary/10 text-primary border border-primary/30">
                SOUND ANALYZER
              </span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`nav-tab-${tab.id}`}
                  className={`
                    flex items-center gap-2 px-4 py-2 font-heading text-sm uppercase tracking-wider
                    transition-all duration-200
                    ${activeTab === tab.id
                      ? 'text-primary bg-primary/10 border-b-2 border-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10"
              data-testid="mobile-nav"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  data-testid={`mobile-tab-${tab.id}`}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 font-heading text-sm uppercase tracking-wider
                    ${activeTab === tab.id
                      ? 'text-primary bg-primary/10 border-l-2 border-primary'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span>THRIVEN</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-primary uppercase">{TABS.find(t => t.id === activeTab)?.name}</span>
          {uploadId && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="font-mono text-gray-400 text-xs">{uploadId.slice(0, 8)}...</span>
            </>
          )}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {renderTabContent()}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>
              <span className="font-heading text-primary">THRIVEN</span> Sound Analyzer v1.0.0
            </p>
            <p className="font-mono text-xs">
              Offline-first audio analysis & 8-stem pack tool
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
