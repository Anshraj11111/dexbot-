/**
 * EmotionColorSwatch — shows the RGB LED color for the active emotion.
 * Requirements: 5.5
 */
import { motion } from 'framer-motion';
import { EMOTION_COLORS } from '@/utils/emotionColors';

export function EmotionColorSwatch({ emotion }) {
  const color = EMOTION_COLORS[emotion] ?? '#FFFFFF';
  return (
    <motion.div
      key={emotion}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3"
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-white/20"
        style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }}
        aria-label={`LED color for ${emotion}`}
      />
      <span className="text-xs text-white/50 font-mono">{color}</span>
    </motion.div>
  );
}
