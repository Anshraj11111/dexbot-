/**
 * RobotControlPage — full-screen control panel for a single robot.
 * Requirements: 4.1–4.9
 */
import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, Link2, Unlink, Send, MessageSquare } from 'lucide-react';
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
import { formatTimestamp } from '@/utils/formatTimestamp';

export default function RobotControlPage() {
  const { botId } = useParams();
  const navigate = useNavigate();
  const robot = useRobotState(botId);

  const [logs, setLogs] = useState([]);
  const [wifiData, setWifiData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [brightness, setBrightness] = useState(128);
  const logsRef = useRef([]);

  // Bot-to-Bot connect state
  const [targetBotId, setTargetBotId] = useState('');
  const [targetBotIp, setTargetBotIp] = useState('');
  const [botConnected, setBotConnected] = useState(false);
  const [botConnecting, setBotConnecting] = useState(false);
  const [botChatMsg, setBotChatMsg] = useState('');
  const [botChatHistory, setBotChatHistory] = useState([]);
  const [botConnectError, setBotConnectError] = useState('');

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

  // Bot-to-Bot connect handlers
  const handleBotConnect = async () => {
    if (!targetBotId.trim() || !targetBotIp.trim()) {
      setBotConnectError('Enter target Bot ID and IP');
      return;
    }
    setBotConnecting(true);
    setBotConnectError('');
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/bot/connect', {
        target_bot_id: targetBotId.trim(),
        target_ip: targetBotIp.trim(),
      });
      setBotConnected(true);
      setBotChatHistory((prev) => [...prev, {
        type: 'system',
        text: `Connected to ${targetBotId}`,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      setBotConnectError(err?.message ?? 'Connection failed');
    } finally {
      setBotConnecting(false);
    }
  };

  const handleBotDisconnect = async () => {
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/bot/disconnect', { target_bot_id: targetBotId.trim() });
    } catch { /* silent */ }
    setBotConnected(false);
    setBotChatHistory((prev) => [...prev, {
      type: 'system',
      text: `Disconnected from ${targetBotId}`,
      timestamp: Date.now(),
    }]);
  };

  const handleBotSendMessage = async () => {
    const msg = botChatMsg.trim();
    if (!msg || !botConnected) return;
    setBotChatMsg('');
    setBotChatHistory((prev) => [...prev, {
      type: 'sent',
      text: msg,
      timestamp: Date.now(),
    }]);
    try {
      const client = getApiClient(botId, `http://${robot.ip}`);
      await client.post('/api/bot/message', {
        target_bot_id: targetBotId.trim(),
        message: msg,
      });
    } catch (err) {
      setBotChatHistory((prev) => [...prev, {
        type: 'error',
        text: `Send failed: ${err?.message ?? 'Unknown error'}`,
        timestamp: Date.now(),
      }]);
    }
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

        {/* Bot-to-Bot Connect Panel */}
        <GlassCard className="p-5 space-y-4 lg:col-span-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider">
            <Link2 className="w-4 h-4 text-accent-cyan" /> Bot-to-Bot Connect
          </h3>

          {/* Connection inputs */}
          {!botConnected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Target Bot ID</label>
                <input
                  type="text"
                  value={targetBotId}
                  onChange={(e) => { setTargetBotId(e.target.value); setBotConnectError(''); }}
                  placeholder="e.g. DEX_001"
                  className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2
                    text-sm text-white placeholder-white/20 outline-none focus:border-accent-cyan/60"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Target Bot IP</label>
                <input
                  type="text"
                  value={targetBotIp}
                  onChange={(e) => { setTargetBotIp(e.target.value); setBotConnectError(''); }}
                  placeholder="e.g. 192.168.1.50"
                  className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2
                    text-sm text-white placeholder-white/20 outline-none focus:border-accent-cyan/60"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {botConnectError && (
            <p className="text-xs text-status-offline flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {botConnectError}
            </p>
          )}

          {/* Connect/Disconnect button */}
          <div className="flex items-center gap-3">
            {!botConnected ? (
              <NeonButton
                onClick={handleBotConnect}
                disabled={botConnecting || !targetBotId.trim() || !targetBotIp.trim()}
              >
                {botConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                {botConnecting ? 'Connecting…' : 'Connect'}
              </NeonButton>
            ) : (
              <>
                <span className="flex items-center gap-1.5 text-xs text-status-online">
                  <span className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
                  Connected to <span className="font-mono">{targetBotId}</span>
                </span>
                <NeonButton variant="danger" size="sm" onClick={handleBotDisconnect}>
                  <Unlink className="w-4 h-4" /> Disconnect
                </NeonButton>
              </>
            )}
          </div>

          {/* Chat area */}
          {(botConnected || botChatHistory.length > 0) && (
            <div className="space-y-3">
              {/* Chat history */}
              <div className="h-40 overflow-y-auto space-y-2 bg-black/20 rounded-xl p-3">
                {botChatHistory.length === 0 && (
                  <p className="text-xs text-white/20 text-center mt-4">No messages yet</p>
                )}
                {botChatHistory.map((entry, i) => (
                  <div key={i} className={`flex ${entry.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-xs
                      ${entry.type === 'sent'
                        ? 'bg-accent-cyan/20 border border-accent-cyan/30 text-white'
                        : entry.type === 'error'
                        ? 'bg-status-offline/10 border border-status-offline/30 text-status-offline'
                        : 'bg-white/[0.05] border border-white/10 text-white/50 italic'
                      }`}>
                      {entry.text}
                      <span className="block text-white/20 text-[10px] mt-0.5">
                        {entry.timestamp ? formatTimestamp(entry.timestamp) : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message input */}
              {botConnected && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={botChatMsg}
                    onChange={(e) => setBotChatMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBotSendMessage()}
                    placeholder="Type message to send to bot…"
                    className="flex-1 bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2
                      text-sm text-white placeholder-white/20 outline-none focus:border-accent-cyan/60"
                  />
                  <NeonButton
                    onClick={handleBotSendMessage}
                    disabled={!botChatMsg.trim()}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </NeonButton>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
