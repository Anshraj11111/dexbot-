/**
 * Computes the reconnect delay for a given attempt number using exponential backoff.
 *
 * @param {number} attempt - Non-negative integer (0-based attempt number)
 * @returns {number} Delay in milliseconds, capped at 30000ms
 *
 * Examples:
 *   attempt 0 → 1000ms
 *   attempt 1 → 2000ms
 *   attempt 4 → 16000ms
 *   attempt 5 → 30000ms (capped)
 *   attempt 9 → 30000ms (capped)
 */
export function computeReconnectDelay(attempt) {
  return Math.min(1000 * Math.pow(2, attempt), 30000);
}
