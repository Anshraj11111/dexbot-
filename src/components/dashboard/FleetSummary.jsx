/**
 * FleetSummary — grid of summary robot cards.
 * Requirements: 2.1, 2.6
 */
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Bot, Settings } from 'lucide-react';
import { useRegisteredBotIds } from '@/hooks/useRobotState';
import { Robot_Card } from '@/components/robot/Robot_Card';

export function FleetSummary() {
  const botIds = useRegisteredBotIds();

  if (botIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bot className="w-16 h-16 text-white/10 mb-4" />
        <h3 className="text-lg font-semibold text-white/40 mb-2">No robots registered</h3>
        <p className="text-sm text-white/30 mb-6">Add your first robot to get started.</p>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-accent-cyan/40
            text-accent-cyan text-sm hover:bg-accent-cyan/10 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      <AnimatePresence>
        {botIds.map((botId) => (
          <Robot_Card key={botId} botId={botId} />
        ))}
      </AnimatePresence>
    </div>
  );
}
