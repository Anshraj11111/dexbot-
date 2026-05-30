/**
 * EmotionFacePreview — animated SVG face for the active emotion.
 * Requirements: 5.4
 */
import { motion } from 'framer-motion';
import { EMOTION_COLORS } from '@/utils/emotionColors';

const FACES = {
  HAPPY: (
    <g>
      <circle cx="35" cy="40" r="5" fill="currentColor" />
      <circle cx="65" cy="40" r="5" fill="currentColor" />
      <path d="M30 60 Q50 75 70 60" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  SAD: (
    <g>
      <circle cx="35" cy="40" r="5" fill="currentColor" />
      <circle cx="65" cy="40" r="5" fill="currentColor" />
      <path d="M30 70 Q50 55 70 70" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  ANGRY: (
    <g>
      <path d="M25 30 L45 38" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M55 38 L75 30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="35" cy="45" r="5" fill="currentColor" />
      <circle cx="65" cy="45" r="5" fill="currentColor" />
      <path d="M35 68 L65 68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  SLEEPY: (
    <g>
      <path d="M25 40 Q35 35 45 40" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M55 40 Q65 35 75 40" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M35 62 Q50 68 65 62" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
      <text x="72" y="30" fontSize="16" fill="currentColor">z</text>
    </g>
  ),
  EXCITED: (
    <g>
      <circle cx="35" cy="38" r="7" fill="currentColor" />
      <circle cx="65" cy="38" r="7" fill="currentColor" />
      <path d="M28 58 Q50 78 72 58" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  NEUTRAL: (
    <g>
      <circle cx="35" cy="40" r="5" fill="currentColor" />
      <circle cx="65" cy="40" r="5" fill="currentColor" />
      <path d="M35 62 L65 62" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
};

export function EmotionFacePreview({ emotion }) {
  const color = EMOTION_COLORS[emotion] ?? '#FFFFFF';
  const face = FACES[emotion] ?? FACES.NEUTRAL;

  return (
    <motion.div
      key={emotion}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-center"
    >
      <svg
        viewBox="0 0 100 100"
        width="80"
        height="80"
        style={{ color }}
        aria-label={`${emotion} face`}
      >
        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
        {face}
      </svg>
    </motion.div>
  );
}
