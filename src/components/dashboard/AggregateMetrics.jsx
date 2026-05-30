/**
 * AggregateMetrics — live fleet-wide metric summary cards.
 * Requirements: 2.3, 2.4
 */
import { Battery, Cpu, Wifi, Home } from 'lucide-react';
import { useAllRobots } from '@/hooks/useRobotState';
import { computeAggregates } from '@/utils/aggregates';
import { GlassCard } from '@/components/ui/GlassCard';

function MetricCard({ icon: Icon, label, value, color }) {
  return (
    <GlassCard className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-current/10`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </GlassCard>
  );
}

export function AggregateMetrics() {
  const robots = useAllRobots();
  const onlineRobots = robots.filter((r) => r.isOnline);
  const { averageBattery, averageCpu, averageRssi } = computeAggregates(onlineRobots);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard
        icon={Battery}
        label="Avg Battery"
        value={`${averageBattery}%`}
        color="text-status-online"
      />
      <MetricCard
        icon={Cpu}
        label="Avg CPU"
        value={`${averageCpu}%`}
        color="text-accent-cyan"
      />
      <MetricCard
        icon={Wifi}
        label="Avg RSSI"
        value={`${averageRssi} dBm`}
        color="text-accent-blue"
      />
      <MetricCard
        icon={Home}
        label="Online Bots"
        value={`${onlineRobots.length}/${robots.length}`}
        color="text-accent-purple"
      />
    </div>
  );
}
