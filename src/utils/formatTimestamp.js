/**
 * Formats a Unix millisecond timestamp for display in the messaging UI.
 *
 * - If the timestamp falls on today's calendar date (local timezone):
 *   returns time as "HH:MM" (24-hour, zero-padded)
 * - If the timestamp is from a prior date:
 *   returns "MMM D, HH:MM" (e.g. "Jan 5, 14:30")
 *
 * @param {number} ts - Unix timestamp in milliseconds
 * @returns {string} Formatted timestamp string
 */
export function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const time = `${hours}:${minutes}`;

  if (isToday) {
    return time;
  }

  // Format month abbreviation and day without leading zero
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();

  return `${month} ${day}, ${time}`;
}
