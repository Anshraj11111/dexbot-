/**
 * WifiConfigPage — per-bot WiFi configuration.
 * Accessible via Settings → WiFi Configuration.
 * Requirements: WiFi Setup UI spec
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi, WifiOff, RefreshCw, Save, Zap, AlertTriangle,
  Eye, EyeOff, RotateCcw, CheckCircle, Loader2, Radio,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useToast } from '@/hooks/useToast';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import { useRobotStore } from '@/services/Robot_State_Manager';
import { useWifiConfig } from '@/hooks/useWifiConfig';

// ── Connection indicator ──────────────────────────────────────────────────────

function ConnectionIndicator({ status }) {
  if (!status) return null;

  if (status.apMode) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400">
        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
        AP Mode
      </span>
    );
  }
  if (status.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-online">
        <span className="w-2 h-2 rounded-full bg-status-online" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-offline">
      <span className="w-2 h-2 rounded-full bg-status-offline" />
      Disconnected
    </span>
  );
}

// ── Countdown overlay ─────────────────────────────────────────────────────────

function CountdownBanner({ count }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl
        bg-status-online/10 border border-status-online/30 text-center"
    >
      <CheckCircle className="w-5 h-5 text-status-online" />
      <p className="text-sm font-medium text-status-online">
        WiFi credentials saved successfully. Device restarting…
      </p>
      <p className="text-3xl font-bold text-white tabular-nums">{count}</p>
      <p className="text-xs text-white/40">Refreshing status automatically…</p>
    </motion.div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="w-full max-w-sm bg-black/90 border border-status-offline/40 rounded-2xl p-6 space-y-4
          shadow-[0_0_40px_rgba(239,68,68,0.2)]"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-status-offline shrink-0" />
          <h3 className="text-base font-semibold text-white">Factory Reset WiFi?</h3>
        </div>
        <p className="text-sm text-white/60">
          Are you sure? Device will forget WiFi settings and enter setup mode.
        </p>
        <div className="flex gap-3 justify-end pt-1">
          <NeonButton variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </NeonButton>
          <NeonButton variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {loading ? 'Resetting…' : 'Reset'}
          </NeonButton>
        </div>
      </motion.div>
    </div>
  );
}

// ── Status card ───────────────────────────────────────────────────────────────

function StatusCard({ status, loading, onRefresh }) {
  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider">
          <Radio className="w-4 h-4 text-accent-cyan" /> Current Status
        </h3>
        <NeonButton variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading…' : 'Refresh'}
        </NeonButton>
      </div>

      {loading && !status && (
        <div className="flex items-center gap-2 text-white/30 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Fetching status…</span>
        </div>
      )}

      {!loading && !status && (
        <p className="text-sm text-white/30 py-2">No status data. Click Refresh to load.</p>
      )}

      {status && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-white/30 mb-1">Status</p>
            <ConnectionIndicator status={status} />
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">SSID</p>
            <p className="text-sm text-white font-mono truncate">{status.ssid || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">IP Address</p>
            <p className="text-sm text-white font-mono">{status.ip && status.ip !== '0.0.0.0' ? status.ip : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Signal</p>
            <p className="text-sm text-white">{status.rssi ? `${status.rssi} dBm` : status.strength ? `${status.strength}%` : '—'}</p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WifiConfigPage() {
  const { showToast } = useToast();
  const botIds = useRegisteredBotIds();

  const [selectedBotId, setSelectedBotId] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(null); // null | number
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Always use the stored IP — it persists across page changes via Zustand+localStorage
  const storedIp = useRobotStore((s) => s.robots[selectedBotId]?.ip ?? '');
  // selectedIp: manual override takes priority, else use stored
  const selectedIp = manualIp.trim() || storedIp;

  const {
    status,
    loadingStatus,
    loadingSave,
    loadingTest,
    loadingReset,
    error,
    fetchStatus,
    saveWifi,
    testConnection,
    resetWifi,
  } = useWifiConfig(selectedBotId, selectedIp);

  // Auto-select first bot
  useEffect(() => {
    if (!selectedBotId && botIds.length > 0) {
      setSelectedBotId(botIds[0]);
    }
  }, [botIds, selectedBotId]);

  // Fetch status when bot or IP changes
  useEffect(() => {
    if (selectedBotId && selectedIp) {
      fetchStatus().catch(() => {});
    }
  }, [selectedBotId, selectedIp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confirm IP on Enter or blur — saves to Zustand store for persistence
  const handleIpConfirm = () => {
    const trimmed = manualIp.trim();
    if (trimmed && selectedBotId) {
      // Persist to store so it survives page navigation
      useRobotStore.getState().setRobotState(selectedBotId, { ip: trimmed });
    }
  };

  // Countdown after save
  const startCountdown = useCallback(() => {
    let n = 5;
    setCountdown(n);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        setCountdown(null);
        fetchStatus().catch(() => {});
      } else {
        setCountdown(n);
      }
    }, 1000);
  }, [fetchStatus]);

  const handleSave = async () => {
    const trimmedSsid = ssid.trim();
    const trimmedPass = password; // don't trim password — spaces may be intentional

    console.log('[WiFi Save] Attempting save:', { ssid: trimmedSsid, passwordLength: trimmedPass.length, ip: selectedIp });

    if (!trimmedSsid) {
      showToast('SSID is required', 'warning');
      return;
    }
    if (!trimmedPass) {
      showToast('Password is required', 'warning');
      return;
    }
    if (!selectedIp) {
      showToast('Enter the device IP address first', 'warning');
      return;
    }
    try {
      await saveWifi(trimmedSsid, trimmedPass);
      startCountdown();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTest = async () => {
    try {
      const result = await testConnection();
      if (result?.connected) {
        showToast(`Connected to "${result.ssid}" — IP: ${result.ip}`, 'success');
      } else if (result?.apMode) {
        showToast('Device is in AP Mode', 'warning');
      } else {
        showToast('Device is not connected to WiFi', 'warning');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReset = async () => {
    try {
      await resetWifi();
      setConfirmOpen(false);
      showToast('WiFi reset. Device entering setup mode.', 'success');
    } catch (err) {
      setConfirmOpen(false);
      showToast(err.message, 'error');
    }
  };

  const handleRefresh = async () => {
    try {
      await fetchStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const isBusy = loadingSave || loadingTest || loadingReset || countdown !== null;

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        onConfirm={handleReset}
        onCancel={() => setConfirmOpen(false)}
        loading={loadingReset}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 sm:p-6 max-w-screen-md mx-auto space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Wifi className="w-6 h-6 text-accent-cyan" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">WiFi Configuration</h1>
            <p className="text-xs text-white/30 mt-0.5">Settings → WiFi Configuration · v5</p>
          </div>
        </div>

        {/* Bot selector */}
        {botIds.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/30 text-sm">
            <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No robots registered. Add a robot in Settings first.
          </GlassCard>
        ) : (
          <>
            <GlassCard className="p-4 space-y-3">
              <label className="text-xs text-white/40 uppercase tracking-wider block">
                Select Robot
              </label>
              <select
                value={selectedBotId}
                onChange={(e) => { setSelectedBotId(e.target.value); setManualIp(''); }}
                className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 py-2.5
                  text-sm text-white outline-none focus:border-accent-cyan/60 transition-colors"
              >
                {botIds.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>

              {/* Manual IP override — shown when no stored IP or user wants to override */}
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">
                  Device IP Address
                </label>
                <input
                  type="text"
                  value={manualIp || storedIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  onBlur={handleIpConfirm}
                  onKeyDown={(e) => e.key === 'Enter' && handleIpConfirm()}
                  placeholder="e.g. 192.168.4.1 (AP mode) or 192.168.1.x"
                  className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 py-2.5
                    text-sm text-white font-mono placeholder-white/20 outline-none
                    focus:border-accent-cyan/60 transition-colors"
                />
                <p className="text-xs text-white/30 mt-1">Press Enter or click away to apply IP</p>
              </div>

              {/* AP mode hint */}
              {!storedIp && !manualIp && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                  <Wifi className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-300/80 space-y-0.5">
                    <p className="font-medium">Device in AP Mode?</p>
                    <p>Connect your computer to the <span className="font-mono text-yellow-200">A5X_Industries</span> WiFi network, then enter <span className="font-mono text-yellow-200">192.168.4.1</span> above.</p>
                  </div>
                </div>
              )}

              {selectedIp && (
                <p className="text-xs text-white/30 font-mono mt-1">
                  Active IP: <span className="text-accent-cyan">{selectedIp}</span>
                  {' — '}
                  <a
                    href={`http://${selectedIp}/api/wifi`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-cyan/60 hover:text-accent-cyan underline transition-colors"
                  >
                    Test in browser ↗
                  </a>
                </p>
              )}
            </GlassCard>

            {/* Status card */}
            <StatusCard
              status={status}
              loading={loadingStatus}
              onRefresh={handleRefresh}
            />

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                    bg-status-offline/10 border border-status-offline/30"
                >
                  <AlertTriangle className="w-4 h-4 text-status-offline shrink-0" />
                  <span className="text-sm text-status-offline">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Countdown banner */}
            <AnimatePresence>
              {countdown !== null && <CountdownBanner count={countdown} />}
            </AnimatePresence>

            {/* Firmware notice — shown when device is in AP mode */}
            {status?.apMode && selectedIp && (
              <GlassCard className="p-4 border-yellow-400/30 bg-yellow-400/5">
                <div className="flex items-start gap-3">
                  <Wifi className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-300">Device is in AP Mode</p>
                    <p className="text-xs text-white/50">
                      This firmware (v1.0.0) only supports <strong className="text-white/70">reading</strong> WiFi status via API.
                      To configure WiFi, use the device's built-in web portal:
                    </p>
                    <a
                      href={`http://${selectedIp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-cyan
                        hover:text-accent-cyan/80 underline transition-colors"
                    >
                      <Wifi className="w-3.5 h-3.5" />
                      Open device portal → http://{selectedIp}
                    </a>
                    <p className="text-xs text-white/30">
                      Or use the Save button below — it will attempt the API call and show the exact error if unsupported.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* WiFi credentials form */}
            <GlassCard className="p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-accent-purple" /> WiFi Credentials
              </h3>

              {/* SSID */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-wider">
                  WiFi SSID
                </label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="Enter network name…"
                  disabled={isBusy}
                  className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 py-2.5
                    text-sm text-white placeholder-white/20 outline-none
                    focus:border-accent-cyan/60 transition-colors disabled:opacity-40"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs text-white/50 mb-1.5 block uppercase tracking-wider">
                  WiFi Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password…"
                    disabled={isBusy}
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-4 py-2.5 pr-10
                      text-sm text-white placeholder-white/20 outline-none
                      focus:border-accent-cyan/60 transition-colors disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <NeonButton
                  variant="primary"
                  onClick={handleTest}
                  disabled={isBusy || !selectedIp}
                  className="flex-1 justify-center"
                >
                  {loadingTest
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Wifi className="w-4 h-4" />
                  }
                  {loadingTest ? 'Testing…' : 'Test Connection'}
                </NeonButton>

                <NeonButton
                  variant="purple"
                  onClick={handleSave}
                  disabled={isBusy || !selectedIp || !ssid.trim()}
                  className="flex-1 justify-center"
                >
                  {loadingSave
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />
                  }
                  {loadingSave ? 'Saving…' : 'Save'}
                </NeonButton>
              </div>
            </GlassCard>

            {/* Factory reset */}
            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-status-offline/80 uppercase tracking-wider">
                    <RotateCcw className="w-4 h-4" /> Factory Reset
                  </h3>
                  <p className="text-xs text-white/30 mt-1">
                    Clears all WiFi settings. Device will enter AP setup mode.
                  </p>
                </div>
                <NeonButton
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isBusy || !selectedIp}
                  className="shrink-0"
                >
                  <RotateCcw className="w-4 h-4" /> Factory Reset
                </NeonButton>
              </div>
            </GlassCard>
          </>
        )}
      </motion.div>
    </>
  );
}
