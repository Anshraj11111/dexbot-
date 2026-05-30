/**
 * AnalyticsPage — historical performance charts.
 * Requirements: 11.1–11.8
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import Firebase_Manager from '@/services/Firebase_Manager';
import { filterMetricsForRange } from '@/utils/metricsFilter';

const TIME_RANGES = [
  { label: '1h', ms: 3600_000 },
  { label: '6h', ms: 21600_000 },
  { label: '24h', ms: 86400_000 },
  { label: '7d', ms: 604800_000 },
];

const CHART_STYLE = {
  background: 'transparent',
  fontSize: 11,
};

function EmptyChart({ message }) {
  return (
    <div className="h-40 flex items-center justify-center text-white/20 text-sm">
      {message}
    </div>
  );
}

function BotCharts({ botId, rangeMs }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const to = Date.now();
    const from = to - rangeMs;
    Firebase_Manager.queryMetricsHistory(botId, from, to)
      .then((pts) => setData(filterMetricsForRange(pts, from, to)))
      .catch(() => setData([]));
  }, [botId, rangeMs]);

  const chartData = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    battery: p.battery,
    cpu: p.cpuUsage,
    temp: p.cpuTemp,
  }));

  if (chartData.length === 0) {
    return <EmptyChart message="No data available for this period" />;
  }

  return (
    <div className="space-y-4">
      {[
        { key: 'battery', label: 'Battery %', color: '#22c55e', domain: [0, 100] },
        { key: 'cpu', label: 'CPU %', color: '#22d3ee', domain: [0, 100] },
        { key: 'temp', label: 'Temp °C', color: '#f97316', domain: ['auto', 'auto'] },
      ].map(({ key, label, color, domain }) => (
        <div key={key}>
          <p className="text-xs text-white/40 mb-1">{label}</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <YAxis domain={domain} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const botIds = useRegisteredBotIds();
  const [rangeIdx, setRangeIdx] = useState(2); // default 24h
  const rangeMs = TIME_RANGES[rangeIdx].ms;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-screen-xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-white tracking-wider">Analytics</h1>
        <div className="flex gap-2">
          {TIME_RANGES.map((r, i) => (
            <NeonButton
              key={r.label}
              variant={rangeIdx === i ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </NeonButton>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {botIds.map((botId) => (
          <GlassCard key={botId} className="p-5">
            <h3 className="font-bold text-white mb-4">{botId}</h3>
            <BotCharts botId={botId} rangeMs={rangeMs} />
          </GlassCard>
        ))}
      </div>
    </motion.div>
  );
}
