/**
 * SystemHealthBadge — fleet health indicator.
 * Requirements: 2.4
 */
import { computeSystemHealth } from '@/utils/systemHealth';

const COLORS = {
  Healthy: 'text-status-online border-status-online/30 bg-status-online/10',
  Degraded: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Critical: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  Offline: 'text-status-offline border-status-offline/30 bg-status-offline/10',
};

export function SystemHealthBadge({ onlineCount, totalCount }) {
  const health = computeSystemHealth(onlineCount, totalCount);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold ${COLORS[health]}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {health}
    </span>
  );
}
