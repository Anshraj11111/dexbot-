/**
 * RobotStatusBadge — online/offline indicator with pulse animation.
 * Requirements: 2.7, 3.2, 3.3
 */
export function RobotStatusBadge({ isOnline, wsStatus }) {
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        bg-status-online/10 border border-status-online/30 text-status-online text-xs font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-online opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-online" />
        </span>
        {wsStatus === 'reconnecting' ? 'Reconnecting' : 'Online'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      bg-status-offline/10 border border-status-offline/30 text-status-offline text-xs font-medium">
      <span className="h-2 w-2 rounded-full bg-status-offline" />
      Offline
    </span>
  );
}
