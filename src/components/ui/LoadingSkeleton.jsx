/**
 * Animated shimmer loading skeleton.
 * Requirements: 3.7
 */
export function LoadingSkeleton({ rows = 3, height = 'h-4', className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-white/[0.08] rounded-lg ${i === rows - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function RobotCardSkeleton() {
  return (
    <div className="bg-white/[0.08] backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 bg-white/10 rounded" />
        <div className="h-5 w-16 bg-white/10 rounded-full" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-white/10 rounded" />
        <div className="h-3 w-4/5 bg-white/10 rounded" />
        <div className="h-3 w-3/5 bg-white/10 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
