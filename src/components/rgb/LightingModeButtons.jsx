/**
 * LightingModeButtons — Rainbow / Breathing / Pulse / Music Reactive.
 * Requirements: 6.4, 6.5
 */
import { motion } from 'framer-motion';
import { Rainbow, Wind, Zap, Music } from 'lucide-react';

const MODES = [
  { id: 'rainbow', label: 'Rainbow', icon: Rainbow },
  { id: 'breathing', label: 'Breathing', icon: Wind },
  { id: 'pulse', label: 'Pulse', icon: Zap },
  { id: 'music', label: 'Music', icon: Music },
];

export function LightingModeButtons({ activeMode, onModeSelect }) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider">Lighting Mode</label>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ id, label, icon: Icon }) => {
          const isActive = activeMode === id;
          return (
            <motion.button
              key={id}
              onClick={() => onModeSelect(id)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all duration-150
                ${isActive
                  ? 'border-accent-purple/60 bg-accent-purple/20 text-accent-purple'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80 hover:bg-white/[0.07]'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
