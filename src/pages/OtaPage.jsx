/**
 * OtaPage — OTA firmware update management.
 * Requirements: 10.1–10.8
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, History, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useToast } from '@/hooks/useToast';
import { useRegisteredBotIds, useRobotState } from '@/hooks/useRobotState';
import { getApiClient } from '@/services/apiClient';
import Firebase_Manager from '@/services/Firebase_Manager';
import { validateOtaFile } from '@/utils/otaValidator';

function BotOtaCard({ botId }) {
  const robot = useRobotState(botId);
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    Firebase_Manager.getOtaHistory(botId).then(setHistory).catch(() => {});
  }, [botId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const result = validateOtaFile(f.name);
    if (!result.valid) { setFileError(result.error); setFile(null); return; }
    setFileError('');
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !robot?.ip) return;
    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('firmware', file);
      const client = getApiClient(botId, `http://${robot.ip}`);

      // Firmware uses /api/ota/install for file upload
      // Try direct upload first, fall back to /api/ota
      let uploadEndpoint = '/api/ota/install';
      try {
        await client.post(uploadEndpoint, formData, {
          timeout: 120_000,
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
        });
      } catch (e) {
        if (e?.status === 404) {
          // Fall back to /api/ota
          await client.post('/api/ota', formData, {
            timeout: 120_000,
            onUploadProgress: (e2) => setProgress(Math.round((e2.loaded / e2.total) * 100)),
          });
        } else {
          throw e;
        }
      }
      await Firebase_Manager.recordOtaHistory(botId, {
        filename: file.name,
        fileSize: file.size,
        deployedAt: Date.now(),
      });
      const updated = await Firebase_Manager.getOtaHistory(botId);
      setHistory(updated);
      showToast(`OTA update complete for ${botId}`, 'success');
      setFile(null);
      setProgress(0);
    } catch (err) {
      showToast(`OTA failed for ${botId}: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRollback = async (record) => {
    showToast(`Rollback not available without stored binary for ${record.filename}`, 'warning');
  };

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">{botId}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${robot?.isOnline
          ? 'bg-status-online/10 text-status-online border border-status-online/30'
          : 'bg-status-offline/10 text-status-offline border border-status-offline/30'}`}>
          {robot?.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* File input */}
      <div>
        <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider">Firmware File</label>
        <input
          type="file"
          accept=".bin"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3
            file:rounded-lg file:border file:border-accent-cyan/40 file:bg-accent-cyan/10
            file:text-accent-cyan file:text-xs file:cursor-pointer
            hover:file:bg-accent-cyan/20 transition-colors"
        />
        {fileError && <p className="text-xs text-status-offline mt-1">{fileError}</p>}
        {file && <p className="text-xs text-white/40 mt-1">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      </div>

      {/* Progress */}
      {uploading && (
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-cyan rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <NeonButton
        onClick={handleUpload}
        disabled={!file || uploading || !robot?.isOnline}
        className="w-full"
      >
        <Upload className="w-4 h-4" />
        {uploading ? `Uploading ${progress}%` : 'Upload Firmware'}
      </NeonButton>

      {/* Version history */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Version History
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between text-xs bg-white/[0.03]
                border border-white/10 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white/80 font-mono">{rec.filename}</p>
                  <p className="text-white/30">
                    {(rec.fileSize / 1024).toFixed(1)} KB · {new Date(rec.deployedAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => handleRollback(rec)} title="Rollback"
                  className="text-white/30 hover:text-accent-cyan transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

export default function OtaPage() {
  const botIds = useRegisteredBotIds();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto space-y-6"
    >
      <h1 className="text-2xl font-bold text-white tracking-wider">OTA Firmware Update</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {botIds.map((botId) => <BotOtaCard key={botId} botId={botId} />)}
      </div>
    </motion.div>
  );
}
