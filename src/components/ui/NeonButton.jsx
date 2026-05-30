/**
 * NeonButton — cyberpunk-styled button with neon glow on hover.
 * Requirements: 13.7
 */
import { motion } from 'framer-motion';

const VARIANTS = {
  primary: 'border-accent-cyan/50 text-accent-cyan hover:border-accent-cyan',
  danger: 'border-status-offline/50 text-status-offline hover:border-status-offline',
  ghost: 'border-white/20 text-white/70 hover:border-white/40',
  purple: 'border-accent-purple/50 text-accent-purple hover:border-accent-purple',
  success: 'border-status-online/50 text-status-online hover:border-status-online',
};

const GLOW_COLORS = {
  primary: 'rgba(34,211,238,0.5)',
  danger: 'rgba(239,68,68,0.5)',
  ghost: 'rgba(255,255,255,0.2)',
  purple: 'rgba(168,85,247,0.5)',
  success: 'rgba(34,197,94,0.5)',
};

export function NeonButton({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  size = 'md',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={
        disabled
          ? {}
          : { boxShadow: `0 0 20px ${GLOW_COLORS[variant] ?? GLOW_COLORS.primary}` }
      }
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-lg border bg-white/[0.05]
        font-medium tracking-wide
        transition-colors duration-150
        ${sizeClasses[size] ?? sizeClasses.md}
        ${VARIANTS[variant] ?? VARIANTS.primary}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}
