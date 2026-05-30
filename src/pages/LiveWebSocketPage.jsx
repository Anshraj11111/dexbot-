/**
 * LiveWebSocketPage — real-time WebSocket event monitor for all robots.
 * Requirements: 9.5, 9.6, 9.8
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Activity } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useRegisteredBotIds, useRobotState } from '@/hooks/useRobotState';
import { useWebSocket } from '@/hooks/useWebSocket';
import WebSocket_Manager from '@/services/WebSocket_Manager';
import { formatTimestamp } from '@/utils/formatTimestamp';

function WsStatusBadge({ status, attempt }) {
  const cfg = {
    connected: { color: 'text-status-online border-status-online/30 bg-status-online/10', label: 'Connected' },
    reconnecting: { color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10', label: `Reconnecting (${attempt})` },
    disconnected: { color: 'text-status-offline border-status-offline/30 bg-status-offline/10', label: 'Disconnected' },
  }[status] ?? { color: 'text-white/40 border-white/20 bg-white/5', label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}

function BotWsCard({ botId }) {
  const robot = useRobotState(botId);
  const [events, setEvents] = useState([]);

  const handleEvent = useCallback((event) => {
    setEvents((prev) => [
      { ...event, receivedAt: Date.now() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useWebSocket(botId, handleEvent);

  const handleRetry = () => {
    if (robot?.ip) WebSocket_Manager.retry(botId, robot.ip, 81);
  };

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-white">{botId}</h3>
          <p className="text-xs text-white/40 font-mono">{robot?.ip ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <WsStatusBadge status={robot?.wsStatus ?? 'disconnected'} attempt={robot?.wsReconnectAttempt ?? 0} />
          {robot?.wsStatus === 'disconnected' && (
            <NeonButton variant="ghost" size="sm" onClick={handleRetry}>
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </NeonButton>
          )}
        </div>
      </div>

      {/* Event feed */}
      <div className="h-48 overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-3 space-y-1 font-mono">
        {events.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">No events yet…</p>
        ) : (
          events.map((ev, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-white/30 shrink-0">{formatTimestamp(ev.receivedAt)}</span>
              <span className="text-accent-cyan/70 shrink-0">[{ev.type}]</span>
              <span className="text-white/60 break-all truncate">
                {JSON.stringify(ev.payload ?? {})}
              </span>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

export default function LiveWebSocketPage() {
  const botIds = useRegisteredBotIds();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-accent-cyan" />
        <h1 className="text-2xl font-bold text-white tracking-wider">Live WebSocket</h1>
      </div>

      {botIds.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No robots registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {botIds.map((botId) => <BotWsCard key={botId} botId={botId} />)}
        </div>
      )}
    </motion.div>
  );
}
