/**
 * Aggregates an array of timestamped events into per-UTC-hour buckets.
 *
 * @param {Array<{ timestamp: number }>} events - Array of event objects with Unix ms timestamps
 * @returns {Array<{ hourKey: string, count: number, timestamp: number }>}
 *   Sorted ascending by hourKey. Each entry represents one UTC hour bucket.
 *   - hourKey: "YYYY-MM-DDTHH" (e.g. "2024-01-15T14")
 *   - count: number of events in that UTC hour
 *   - timestamp: Unix ms of the start of that UTC hour
 */
export function aggregateByHour(events) {
  if (!events || events.length === 0) {
    return [];
  }

  /** @type {Map<string, { count: number, timestamp: number }>} */
  const buckets = new Map();

  for (const event of events) {
    const date = new Date(event.timestamp);

    // Build "YYYY-MM-DDTHH" key in UTC
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const hourKey = `${year}-${month}-${day}T${hour}`;

    if (buckets.has(hourKey)) {
      buckets.get(hourKey).count += 1;
    } else {
      // Compute the Unix ms for the start of this UTC hour
      const hourStart = Date.UTC(year, date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), 0, 0, 0);
      buckets.set(hourKey, { count: 1, timestamp: hourStart });
    }
  }

  // Convert to array and sort ascending by hourKey
  return Array.from(buckets.entries())
    .map(([hourKey, { count, timestamp }]) => ({ hourKey, count, timestamp }))
    .sort((a, b) => (a.hourKey < b.hourKey ? -1 : a.hourKey > b.hourKey ? 1 : 0));
}
