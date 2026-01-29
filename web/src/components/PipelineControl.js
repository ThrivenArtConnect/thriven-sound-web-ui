import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Search, 
  BarChart3, 
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    id: 'scan',
    name: 'Scan',
    description: 'Scan folder, extract metadata & detect duplicates',
    icon: Search,
  },
  {
    id: 'analyze',
    name: 'Analyze',
    description: 'Calculate LUFS, Peak, RMS & Silence %',
    icon: BarChart3,
  },
  {
    id: 'export',
    name: 'Export',
    description: 'Rank files & export top N with reports',
    icon: Download,
  },
];

export default function PipelineControl({ uploadId, onStepComplete, currentStep, status }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [stepStatus, setStepStatus] = useState({});
  const [progress, setProgress] = useState(0);

  const runStep = async (stepId) => {
    if (running || !uploadId) return;
    
    setRunning(true);
    setError(null);
    setStepStatus(prev => ({ ...prev, [stepId]: 'running' }));
    setProgress(0);

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, step: stepId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pipeline step failed');
      }

      setStepStatus(prev => ({ ...prev, [stepId]: 'complete' }));
      setProgress(100);
      
      if (onStepComplete) {
        onStepComplete(stepId, data);
      }
    } catch (err) {
      setError(err.message);
      setStepStatus(prev => ({ ...prev, [stepId]: 'error' }));
    } finally {
      setRunning(false);
    }
  };

  const runAllSteps = async () => {
    for (const step of PIPELINE_STEPS) {
      if (stepStatus[step.id] !== 'complete') {
        await runStep(step.id);
        if (stepStatus[step.id] === 'error') break;
      }
    }
  };

  const getStepIcon = (step) => {
    const status = stepStatus[step.id];
    if (status === 'running') return <Loader2 className="w-5 h-5 animate-spin" />;
    if (status === 'complete') return <CheckCircle2 className="w-5 h-5 text-success" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-error" />;
    return <step.icon className="w-5 h-5" />;
  };

  return (
    <div className="cyber-card p-6" data-testid="pipeline-control">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-lg font-bold text-white uppercase tracking-wider">
          Pipeline Control
        </h2>
        <button
          onClick={runAllSteps}
          disabled={running || !uploadId}
          data-testid="run-all-pipeline-btn"
          className="cyber-btn flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          Run All
        </button>
      </div>

      {/* Progress bar */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="cyber-progress">
              <motion.div
                className="cyber-progress-bar"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="mt-2 text-xs font-mono text-gray-400">
              Processing...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline steps */}
      <div className="space-y-3">
        {PIPELINE_STEPS.map((step, index) => {
          const status = stepStatus[step.id];
          const isDisabled = running || !uploadId || (index > 0 && stepStatus[PIPELINE_STEPS[index - 1].id] !== 'complete');

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-4 border transition-all duration-300 cursor-pointer
                ${status === 'complete' 
                  ? 'border-success/30 bg-success/5' 
                  : status === 'running'
                    ? 'border-primary/50 bg-primary/10'
                    : status === 'error'
                      ? 'border-error/30 bg-error/5'
                      : 'border-white/10 bg-black/20 hover:border-primary/30'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !isDisabled && runStep(step.id)}
              data-testid={`pipeline-step-${step.id}`}
            >
              <div className="flex items-center gap-4">
                {/* Step number */}
                <div className={`
                  w-8 h-8 flex items-center justify-center font-heading font-bold text-sm
                  ${status === 'complete' 
                    ? 'bg-success/20 text-success' 
                    : status === 'running'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-white/10 text-gray-400'
                  }
                `}>
                  {index + 1}
                </div>

                {/* Step info */}
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-white uppercase tracking-wider text-sm">
                    {step.name}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                </div>

                {/* Step icon/status */}
                <div className={`
                  p-2
                  ${status === 'complete' 
                    ? 'text-success' 
                    : status === 'running'
                      ? 'text-primary'
                      : 'text-gray-500'
                  }
                `}>
                  {getStepIcon(step)}
                </div>
              </div>

              {/* Connector line */}
              {index < PIPELINE_STEPS.length - 1 && (
                <div className="absolute left-[2.25rem] top-full h-3 w-[2px] bg-white/10" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 bg-error/10 border border-error/30 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
            <p className="text-error text-sm font-mono">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
