/**
 * NotificationBadge — small red count badge overlaid on a nav icon.
 * Renders null when count is 0.
 * Requirements: 2.5, 6.2
 */

/**
 * @param {{ count: number }} props
 */
export function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      aria-label={`${count} unread notification${count === 1 ? '' : 's'}`}
      className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5
        flex items-center justify-center
        rounded-full bg-red-500 border border-black/40
        text-[0.6rem] font-bold text-white leading-none
        pointer-events-none select-none"
    >
      {label}
    </span>
  );
}
