/**
 * LiveLogFeed — real-time WebSocket log display.
 * Requirements: 4.7
 */
import { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import { formatTimestamp } from '@/utils/formatTimestamp';

export function LiveLogFeed({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-accent-cyan" />
        <span className="text-xs text-white/50 uppercase tracking-wider">Live Log</span>
        <span className="text-xs text-white/30">({logs.length}/100)</span>
      </div>
      <div className="h-48 overflow-y-auto bg-black/40 border border-white/10 rounded-xl p-3 space-y-1 font-mono">
        {logs.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-4">Waiting for events…</p>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <span className="text-white/30 shrink-0">{formatTimestamp(entry.timestamp)}</span>
              <span className="text-accent-cyan/80 break-all">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
