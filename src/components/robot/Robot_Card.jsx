/**
 * Robot_Card — full status card for a single robot.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
import { motion } from 'framer-motion';
import { MapPin, Clock, Network } from 'lucide-react';
import { useRobotState } from '@/hooks/useRobotState';
import { RobotStatusBadge } from './RobotStatusBadge';
import { RobotMetricsRow } from './RobotMetricsRow';
import { RobotActionButtons } from './RobotActionButtons';
import { formatUptime } from '@/utils/formatUptime';

const EMOTION_ICONS = {
  HAPPY: '😊', SAD: '😢', ANGRY: '😠',
  SLEEPY: '😴', EXCITED: '🤩', NEUTRAL: '😐',
};

export function Robot_Card({ botId }) {
  const robot = useRobotState(botId);

  if (!robot) return null;

  const {
    isOnline, wsStatus, emotion, battery, rssi,
    cpuTemp, memoryUsage, uptime, ip, roomName,
  } = robot;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isOnline ? 1 : 0.5, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-white/[0.08] backdrop-blur-xl border rounded-2xl p-5
        shadow-[0_0_20px_rgba(168,85,247,0.1)] flex flex-col gap-4
        ${isOnline ? 'border-purple-500/40' : 'border-white/10'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-white text-base tracking-wide">{botId}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-lg">{EMOTION_ICONS[emotion] ?? '😐'}</span>
            <span className="text-xs text-white/50">{emotion}</span>
          </div>
        </div>
        <RobotStatusBadge isOnline={isOnline} wsStatus={wsStatus} />
      </div>

      {/* Metrics */}
      <RobotMetricsRow
        battery={battery}
        rssi={rssi}
        cpuTemp={cpuTemp}
        memoryUsage={memoryUsage}
      />

      {/* Info row */}
      <div className="space-y-1 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5" />
          <span>{ip || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          <span>{roomName || 'No Room'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatUptime(uptime ?? 0)}</span>
        </div>
      </div>

      {/* Actions */}
      <RobotActionButtons botId={botId} />
    </motion.div>
  );
}
