/**
 * RobotControlPage — full-screen control panel for a single robot.
 * Requirements: 4.1–4.9
 */
import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useRobotState } from '@/hooks/useRobotState';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getApiClient } from '@/services/apiClient';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { RobotStatusBadge } from '@/components/robot/RobotStatusBadge';
import { EmotionPanel } from '@/components/emotion/EmotionPanel';
import { RGB_Controller } from '@/components/rgb/RGB_Controller';
import { CommandInput } from '@/components/control/CommandInput';
import { VolumeSlider } from '@/components/control/VolumeSlider';
import { LiveLogFeed } from '@/components/control/LiveLogFeed';
import { WifiPanel } from '@/components/control/WifiPanel';
import { useRobotStore } from '@/services/Robot_State_Manager';

export default function RobotControlPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const robot = useRobotState(botId);

  const [logs, setLogs] = useState([]);
  const [wifiData, setWifiData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [brightness, setBrightness] = useState(128);
  const logsRef = useRef([]);

  // WebSocket event handler
  const handleWsEvent = useCallback((event) => {
    if (event.type === 'log_message') {
      const entry = { timestamp: Date.now(), message: event.payload?.message ?? JSON.stringify(event.payload) };
      logsRef.current = [...logsRef.current.slice(-99), entry];
      setLogs([...logsRef.current]);
    }
    if (event.type === 'wifi_update') {
      setWifiData(event.payload);
    }
  }, []);

  useWebSocket(botId, handleWsEvent);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!robot?.ip) return;
    setFetchError(null);
    const client = getApiClient(botId, `http://${robot.ip}`);
    try {
      const [statusRes, metricsRes, wifiRes] = await Promise.allSettled([
        client.get('/api/status'),
        client.get('/api/metrics'),
        client.get('/api/wifi'),
      ]);
      if (statusRes.status === 'fulfilled') {
        useRobotStore.getState().setRobotState(botId, { ...statusRes.value.data, isOnline: true });
      }
      if (metricsRes.status === 'fulfilled') {
        useRobotStore.getState().setRobotState(botId, metricsRes.value.data);
      }
      if (wifiRes.status === 'fulfilled') {
        setWifiData(wifiRes.value.data);
      }
    } catch (err) {
      setFetchError(err.message ?? 'Failed to fetch robot data');
    }
  }, [botId, robot?.ip]);

  // Brightness slider send
  const handleBrightnessRelease = async (val) => {
    setBrightness(val);
    if (!robot?.ip) return;
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/command', { command: 'set_brightness', value: val });
    } catch { /* silent */ }
  };

  if (!robot) {
    return (
      <div className="p-6 text-center text-white/40">
        <p>Robot <span className="text-white font-mono">{botId}</span> not found.</p>
        <NeonButton onClick={() => navigate('/robots')} className="mt-4">Back to Robots</NeonButton>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/robots')} className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-wider">{botId}</h1>
          <p className="text-xs text-white/40 font-mono">{robot.ip}</p>
        </div>
        <RobotStatusBadge isOnline={robot.isOnline} wsStatus={robot.wsStatus} />
        <NeonButton variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </NeonButton>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-status-offline/10 border border-status-offline/30">
          <AlertCircle className="w-4 h-4 text-status-offline shrink-0" />
          <span className="text-sm text-status-offline flex-1">{fetchError}</span>
          <NeonButton variant="danger" size="sm" onClick={fetchData}>Retry</NeonButton>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Status metrics */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Status</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Battery', `${robot.battery ?? 0}%`],
              ['CPU', `${robot.cpuUsage ?? 0}%`],
              ['Temp', `${robot.cpuTemp ?? 0}°C`],
              ['Memory', `${robot.memoryUsage ?? 0}%`],
              ['RSSI', `${robot.rssi ?? 0} dBm`],
              ['Uptime', `${robot.uptime ?? 0}s`],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-white/30">{label}</p>
                <p className="font-mono text-white">{val}</p>
              </div>
            ))}
          </div>
          <WifiPanel wifiData={wifiData} />
        </GlassCard>

        {/* Commands */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Commands</h3>
          <CommandInput botId={botId} />
          <VolumeSlider botId={botId} />
          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-white/40 uppercase tracking-wider">Brightness</label>
              <span className="text-xs font-mono text-white/60">{brightness}</span>
            </div>
            <input
              type="range" min={0} max={255} step={1} value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              onMouseUp={() => handleBrightnessRelease(brightness)}
              onTouchEnd={() => handleBrightnessRelease(brightness)}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-accent-cyan [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-white/30"
            />
          </div>
        </GlassCard>

        {/* Live log */}
        <GlassCard className="p-5">
          <LiveLogFeed logs={logs} />
        </GlassCard>

        {/* Emotion panel */}
        <EmotionPanel botId={botId} />

        {/* RGB controller */}
        <div className="lg:col-span-2">
          <RGB_Controller botId={botId} />
        </div>
      </div>
    </motion.div>
  );
}
