/**
 * Filters an array of metric data points to only those within a given time range.
 *
 * @param {Array<{timestamp: number, [key: string]: any}>} points - Array of metric objects, each with a `timestamp` field (Unix ms)
 * @param {number} from - Start of range, Unix milliseconds (inclusive)
 * @param {number} to - End of range, Unix milliseconds (inclusive)
 * @returns {Array<{timestamp: number, [key: string]: any}>} New array of points where from <= point.timestamp <= to, in original order
 */
export function filterMetricsForRange(points, from, to) {
  if (!points || points.length === 0) {
    return [];
  }

  return points.filter(
    (point) => point.timestamp >= from && point.timestamp <= to
  );
}
