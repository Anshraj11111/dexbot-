/**
 * EmotionButton — animated button for a single emotion.
 * Requirements: 5.1
 */
import { motion } from 'framer-motion';
import { EMOTION_COLORS } from '@/utils/emotionColors';

const EMOTION_ICONS = {
  HAPPY: '😊', SAD: '😢', ANGRY: '😠',
  SLEEPY: '😴', EXCITED: '🤩', NEUTRAL: '😐',
};

export function EmotionButton({ emotion, isActive, isDisabled, onClick }) {
  const color = EMOTION_COLORS[emotion] ?? '#FFFFFF';

  return (
    <motion.button
      onClick={() => !isDisabled && onClick(emotion)}
      disabled={isDisabled}
      whileTap={isDisabled ? {} : { scale: 0.92 }}
      whileHover={isDisabled ? {} : { scale: 1.05 }}
      transition={{ duration: 0.15 }}
      style={isActive ? { borderColor: color, boxShadow: `0 0 16px ${color}40` } : {}}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150
        ${isActive
          ? 'bg-white/10'
          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'
        }
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className="text-2xl">{EMOTION_ICONS[emotion]}</span>
      <span className="text-xs font-medium tracking-wider" style={{ color: isActive ? color : 'rgba(255,255,255,0.5)' }}>
        {emotion}
      </span>
    </motion.button>
  );
}
