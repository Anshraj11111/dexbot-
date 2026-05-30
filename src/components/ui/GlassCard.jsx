/**
 * GlassCard — glassmorphism card base component.
 * Requirements: 13.4, 13.5
 */
import { motion } from 'framer-motion';

export function GlassCard({ children, className = '', onClick, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        bg-white/[0.08] backdrop-blur-xl
        border border-purple-500/40
        rounded-2xl
        shadow-[0_0_20px_rgba(168,85,247,0.15)]
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
