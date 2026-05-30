/**
 * Converts a non-negative integer number of seconds into a human-readable
 * uptime string in the format "Xd Xh Xm".
 *
 * All three components (days, hours, minutes) are always present.
 *
 * @param {number} seconds - Non-negative integer number of seconds
 * @returns {string} Formatted uptime string, e.g. "1d 1h 1m"
 *
 * @example
 * formatUptime(0)      // "0d 0h 0m"
 * formatUptime(86400)  // "1d 0h 0m"
 * formatUptime(90061)  // "1d 1h 1m"
 */
export function formatUptime(seconds) {
  const totalSeconds = Math.floor(seconds);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
}
