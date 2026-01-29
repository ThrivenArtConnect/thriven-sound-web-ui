import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  RefreshCw, 
  Music, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const SLOT_TYPES = [
  { slot: '01', name: 'KICK', color: 'bg-red-500' },
  { slot: '02', name: 'BASS', color: 'bg-orange-500' },
  { slot: '03', name: 'DRUMS', color: 'bg-yellow-500' },
  { slot: '04', name: 'PERC', color: 'bg-green-500' },
  { slot: '05', name: 'SYNTH', color: 'bg-teal-500' },
  { slot: '06', name: 'PADS', color: 'bg-blue-500' },
  { slot: '07', name: 'FX', color: 'bg-purple-500' },
  { slot: '08', name: 'VOCALS', color: 'bg-pink-500' },
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_MODES = ['maj', 'min'];

export default function StemmapEditor({ uploadId }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stemmapData, setStemmapData] = useState(null);
  const [items, setItems] = useState([]);
  const [packTitle, setPackTitle] = useState('PACK');
  const [globalBpm, setGlobalBpm] = useState(120);
  const [globalKey, setGlobalKey] = useState('');

  // Parse YAML to items
  const parseYaml = (yamlStr) => {
    try {
      // Simple YAML parsing for the items section
      const lines = yamlStr.split('\n');
      const parsedItems = [];
      let currentItem = null;

      for (const line of lines) {
        if (line.trim().startsWith('- file:')) {
          if (currentItem) parsedItems.push(currentItem);
          currentItem = { file: line.split(':')[1].trim().replace(/"/g, '') };
        } else if (currentItem) {
          const match = line.match(/^\s+(\w+):\s*(.*)$/);
          if (match) {
            const [, key, value] = match;
            currentItem[key] = value.replace(/"/g, '').trim();
            if (value === 'null' || value === '') currentItem[key] = null;
            if (value === 'true') currentItem[key] = true;
            if (value === 'false') currentItem[key] = false;
            if (['bpm', 'slot'].includes(key) && value) {
              currentItem[key] = parseInt(value, 10) || value;
            }
          }
        }
      }
      if (currentItem) parsedItems.push(currentItem);

      return parsedItems;
    } catch {
      return [];
    }
  };

  // Generate YAML from items
  const generateYaml = () => {
    const yaml = `meta:
  generated_at: "${new Date().toISOString()}"
  pack_title: "${packTitle}"
  bpm_range:
    min: 90
    max: 190
  policy: "BR-864 8-slot"
  note: "Assign each file to a slot/type. Slot 08 is VOCALS/Backing Vocals."
  in_dir: stems_raw
  out_dir: stems_8
slots:
${SLOT_TYPES.map(s => `  - slot: "${s.slot}"
    type: ${s.name}`).join('\n')}
items:
${items.map(item => `  - file: "${item.file}"
    guess_type: ${item.guess_type || 'UNKNOWN'}
    slot: ${item.slot || 'null'}
    type: ${item.type || 'null'}
    bpm: ${item.bpm || 'null'}
    key: ${item.key || 'null'}
    title: "${item.title || item.file.replace(/\.[^.]+$/, '')}"
    enabled: ${item.enabled !== false}
    notes: "${item.notes || ''}"`).join('\n')}`;
    return yaml;
  };

  const loadStemmap = async (generate = false) => {
    if (!uploadId) return;
    
    setLoading(true);
    setError(null);

    try {
      if (generate) {
        const response = await fetch('/api/stemmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, action: 'generate', title: packTitle }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setStemmapData(data.yaml);
        setItems(parseYaml(data.yaml));
        setSuccess('Stemmap generated successfully!');
      } else {
        const response = await fetch(`/api/stemmap?uploadId=${uploadId}`);
        const data = await response.json();
        if (response.ok) {
          setStemmapData(data.yaml);
          setItems(parseYaml(data.yaml));
        } else if (response.status === 404) {
          // No stemmap yet, generate one
          await loadStemmap(true);
        } else {
          throw new Error(data.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveStemmap = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const yaml = generateYaml();
      const response = await fetch('/api/stemmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uploadId, 
          action: 'save', 
          stemmapData: yaml,
          packTitle,
          bpm: globalBpm,
          key: globalKey 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSuccess('Stemmap saved!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const applyStemmap = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // First save
      await saveStemmap();
      
      // Then apply
      const response = await fetch('/api/stemmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, action: 'apply' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSuccess('Stemmap applied! Files copied to stems_8/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const applyGlobalBpm = () => {
    setItems(prev => prev.map(item => ({ ...item, bpm: globalBpm })));
  };

  const applyGlobalKey = () => {
    setItems(prev => prev.map(item => ({ ...item, key: globalKey })));
  };

  useEffect(() => {
    if (uploadId) {
      loadStemmap();
    }
  }, [uploadId]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!uploadId) {
    return (
      <div className="cyber-card p-8 text-center">
        <Music className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Upload files first to access the stemmap editor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="stemmap-editor">
      {/* Header controls */}
      <div className="cyber-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-heading text-lg font-bold text-white uppercase tracking-wider">
            8-Stem Mapping Editor
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => loadStemmap(true)}
              disabled={loading}
              data-testid="regenerate-stemmap-btn"
              className="cyber-btn cyber-btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </button>
            <button
              onClick={saveStemmap}
              disabled={saving || items.length === 0}
              data-testid="save-stemmap-btn"
              className="cyber-btn flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={applyStemmap}
              disabled={saving || items.length === 0}
              data-testid="apply-stemmap-btn"
              className="cyber-btn flex items-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Apply & Create stems_8/
            </button>
          </div>
        </div>

        {/* Global settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-400 uppercase mb-2">Pack Title</label>
            <input
              type="text"
              value={packTitle}
              onChange={(e) => setPackTitle(e.target.value)}
              data-testid="pack-title-input"
              className="cyber-input w-full"
              placeholder="Pack Title"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase mb-2">Global BPM (90-190)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="90"
                max="190"
                value={globalBpm}
                onChange={(e) => setGlobalBpm(parseInt(e.target.value, 10) || 120)}
                data-testid="global-bpm-input"
                className="cyber-input flex-1"
              />
              <button
                onClick={applyGlobalBpm}
                className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20"
              >
                Apply All
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase mb-2">Global Key</label>
            <div className="flex gap-2">
              <select
                value={globalKey}
                onChange={(e) => setGlobalKey(e.target.value)}
                data-testid="global-key-input"
                className="cyber-select flex-1"
              >
                <option value="">—</option>
                {KEYS.map(k => KEY_MODES.map(m => (
                  <option key={`${k}${m}`} value={`${k}${m}`}>{k} {m}</option>
                )))}
              </select>
              <button
                onClick={applyGlobalKey}
                className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary text-xs hover:bg-primary/20"
              >
                Apply All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slot legend */}
      <div className="flex flex-wrap gap-2">
        {SLOT_TYPES.map(s => (
          <div key={s.slot} className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10">
            <div className={`w-3 h-3 ${s.color}`} />
            <span className="text-xs font-mono text-gray-400">{s.slot}: {s.name}</span>
          </div>
        ))}
      </div>

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

      {/* Items list */}
      {loading ? (
        <div className="cyber-card p-12 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="mt-4 text-gray-400">Loading stemmap...</p>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.file || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`cyber-card p-4 ${!item.enabled ? 'opacity-50' : ''}`}
              data-testid={`stemmap-item-${index}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                {/* Filename */}
                <div className="md:col-span-2">
                  <p className="font-mono text-sm text-white truncate" title={item.file}>
                    {item.file}
                  </p>
                  <p className="text-xs text-gray-500">
                    Detected: <span className="text-primary">{item.guess_type || 'UNKNOWN'}</span>
                  </p>
                </div>

                {/* Slot */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Slot</label>
                  <select
                    value={item.slot || ''}
                    onChange={(e) => {
                      const slot = e.target.value;
                      const type = SLOT_TYPES.find(s => s.slot === slot)?.name || null;
                      updateItem(index, 'slot', slot || null);
                      updateItem(index, 'type', type);
                    }}
                    data-testid={`slot-select-${index}`}
                    className="cyber-select w-full text-sm"
                  >
                    <option value="">—</option>
                    {SLOT_TYPES.map(s => (
                      <option key={s.slot} value={s.slot}>{s.slot} - {s.name}</option>
                    ))}
                  </select>
                </div>

                {/* BPM */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">BPM</label>
                  <input
                    type="number"
                    min="90"
                    max="190"
                    value={item.bpm || ''}
                    onChange={(e) => updateItem(index, 'bpm', parseInt(e.target.value, 10) || null)}
                    data-testid={`bpm-input-${index}`}
                    className="cyber-input w-full text-sm"
                    placeholder="—"
                  />
                </div>

                {/* Key */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Key</label>
                  <select
                    value={item.key || ''}
                    onChange={(e) => updateItem(index, 'key', e.target.value || null)}
                    data-testid={`key-select-${index}`}
                    className="cyber-select w-full text-sm"
                  >
                    <option value="">—</option>
                    {KEYS.map(k => KEY_MODES.map(m => (
                      <option key={`${k}${m}`} value={`${k}${m}`}>{k} {m}</option>
                    )))}
                  </select>
                </div>

                {/* Enabled toggle */}
                <div className="flex items-center justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled !== false}
                      onChange={(e) => updateItem(index, 'enabled', e.target.checked)}
                      data-testid={`enabled-checkbox-${index}`}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-xs text-gray-400">Enabled</span>
                  </label>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="cyber-card p-12 text-center">
          <Music className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No files found. Upload audio files first.</p>
        </div>
      )}
    </div>
  );
}
