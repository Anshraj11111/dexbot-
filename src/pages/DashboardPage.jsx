/**
 * DashboardPage — main fleet overview.
 * Requirements: 2.1–2.8
 * Polls all registered bots on mount and every 5 s to keep online status fresh.
 */
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAllRobots, useRegisteredBotIds } from '@/hooks/useRobotState';
import { useRobotStore } from '@/services/Robot_State_Manager';
import { getApiClient } from '@/services/apiClient';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { AggregateMetrics } from '@/components/dashboard/AggregateMetrics';
import { SystemHealthBadge } from '@/components/dashboard/SystemHealthBadge';
import { FleetSummary } from '@/components/dashboard/FleetSummary';

export default function DashboardPage() {
  const robots = useAllRobots();
  const botIds = useRegisteredBotIds();
  const onlineCount = robots.filter((r) => r.isOnline).length;

  // Poll all bots to keep online/metrics status fresh on the dashboard
  useEffect(() => {
    if (botIds.length === 0) return;

    const pollAll = async () => {
      await Promise.allSettled(
        botIds.map(async (botId) => {
          const robot = useRobotStore.getState().robots[botId];
          // Skip bots with no IP — they can't be polled
          if (!robot?.ip) {
            useRobotStore.getState().setOnline(botId, false);
            return;
          }
          const client = getApiClient(botId, `http://${robot.ip}`);
          try {
            const [statusRes, metricsRes] = await Promise.allSettled([
              client.get('/api/status', { timeout: 3000 }),
              client.get('/api/metrics', { timeout: 3000 }),
            ]);
            if (statusRes.status === 'fulfilled') {
              const partial = { ...statusRes.value.data, isOnline: true };
              if (metricsRes.status === 'fulfilled') {
                Object.assign(partial, metricsRes.value.data);
              }
              useRobotStore.getState().setRobotState(botId, partial);
            } else {
              useRobotStore.getState().setOnline(botId, false);
            }
          } catch {
            useRobotStore.getState().setOnline(botId, false);
          }
        })
      );
    };

    pollAll();
    const interval = setInterval(pollAll, 5000);
    return () => clearInterval(interval);
  }, [botIds.join(',')]);

  return (
    <div className="relative min-h-screen p-6">
      <ParticleBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 max-w-screen-2xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">Fleet Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">
              {robots.length} robots registered · {onlineCount} online
            </p>
          </div>
          <SystemHealthBadge onlineCount={onlineCount} totalCount={robots.length} />
        </div>

        {/* Aggregate metrics */}
        <AggregateMetrics />

        {/* Fleet grid */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            Robot Fleet
          </h2>
          <FleetSummary />
        </div>
      </motion.div>
    </div>
  );
}
