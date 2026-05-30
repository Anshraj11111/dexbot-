/**
 * Computes the system health status based on the number of online robots.
 *
 * @param {number} onlineCount - Number of robots currently online (0 <= onlineCount <= totalCount)
 * @param {number} totalCount  - Total number of registered robots (totalCount > 0)
 * @returns {"Healthy" | "Degraded" | "Critical" | "Offline"}
 */
export function computeSystemHealth(onlineCount, totalCount) {
  if (onlineCount === 0) {
    return 'Offline';
  }

  const ratio = onlineCount / totalCount;

  if (onlineCount === totalCount) {
    return 'Healthy';
  }

  if (ratio >= 0.5) {
    // 50–99% online (onlineCount < totalCount already guaranteed here)
    return 'Degraded';
  }

  // ratio > 0 && ratio < 0.5  →  1–49% online
  return 'Critical';
}
