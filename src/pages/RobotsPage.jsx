/**
 * RobotsPage — full robot fleet management with cards.
 * Requirements: 3.1, 3.7, 3.8
 */
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, Settings } from 'lucide-react';
import { useRobotStore } from '@/services/Robot_State_Manager';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import { getApiClient } from '@/services/apiClient';
import { Robot_Card } from '@/components/robot/Robot_Card';
import { RobotCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useState } from 'react';

export default function RobotsPage() {
  const botIds = useRegisteredBotIds();
  const [loading, setLoading] = useState(true);
  const store = useRobotStore.getState();

  useEffect(() => {
    if (botIds.length === 0) { setLoading(false); return; }

    const fetchAll = async () => {
      await Promise.allSettled(
        botIds.map(async (botId) => {
          const robot = useRobotStore.getState().robots[botId];
          if (!robot?.ip) return;
          // Use short timeout for polling — don't block on offline robots
          const client = getApiClient(botId, `http://${robot.ip}`);
          try {
            const [deviceRes, statusRes, metricsRes] = await Promise.allSettled([
              client.get('/api/device', { timeout: 3000 }),
              client.get('/api/status', { timeout: 3000 }),
              client.get('/api/metrics', { timeout: 3000 }),
            ]);
            const partial = {};
            if (statusRes.status === 'fulfilled') {
              Object.assign(partial, statusRes.value.data, { isOnline: true });
            } else {
              // Request failed — mark offline
              useRobotStore.getState().setOnline(botId, false);
              return;
            }
            if (metricsRes.status === 'fulfilled') {
              Object.assign(partial, metricsRes.value.data);
            }
            if (deviceRes.status === 'fulfilled') {
              partial.firmwareVersion = deviceRes.value.data.firmwareVersion;
            }
            if (Object.keys(partial).length > 0) {
              useRobotStore.getState().setRobotState(botId, partial);
            }
          } catch {
            useRobotStore.getState().setOnline(botId, false);
          }
        })
      );
      setLoading(false);
    };

    fetchAll();

    // Poll every 5 seconds
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [botIds.join(',')]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-2xl mx-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">Robots</h1>
          <p className="text-sm text-white/40 mt-1">{botIds.length} registered</p>
        </div>
      </div>

      {botIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bot className="w-16 h-16 text-white/10 mb-4" />
          <h3 className="text-lg font-semibold text-white/40 mb-2">No robots registered</h3>
          <Link to="/settings" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
            border border-accent-cyan/40 text-accent-cyan text-sm hover:bg-accent-cyan/10 transition-colors">
            <Settings className="w-4 h-4" /> Add Robot
          </Link>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {botIds.map((id) => <RobotCardSkeleton key={id} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {botIds.map((botId) => <Robot_Card key={botId} botId={botId} />)}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
