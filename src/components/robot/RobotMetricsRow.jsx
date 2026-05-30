/**
 * RobotMetricsRow — compact metrics display for a robot card.
 * Requirements: 3.2
 */
import { Battery, Wifi, Thermometer, Cpu } from 'lucide-react';

function MetricItem({ icon: Icon, value, label, color = 'text-white/60' }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs text-white/70">{value}</span>
      {label && <span className="text-xs text-white/30">{label}</span>}
    </div>
  );
}

function getBatteryColor(pct) {
  if (pct > 60) return 'text-status-online';
  if (pct > 20) return 'text-yellow-400';
  return 'text-status-offline';
}

export function RobotMetricsRow({ battery, rssi, cpuTemp, memoryUsage }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
      <MetricItem
        icon={Battery}
        value={`${battery ?? 0}%`}
        color={getBatteryColor(battery ?? 0)}
      />
      <MetricItem
        icon={Wifi}
        value={`${rssi ?? 0} dBm`}
        color="text-accent-cyan"
      />
      <MetricItem
        icon={Thermometer}
        value={`${cpuTemp ?? 0}°C`}
        color="text-orange-400"
      />
      <MetricItem
        icon={Cpu}
        value={`${memoryUsage ?? 0}%`}
        label="mem"
        color="text-accent-purple"
      />
    </div>
  );
}
