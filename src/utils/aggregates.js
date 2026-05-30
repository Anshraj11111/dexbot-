/**
 * Computes aggregate statistics across an array of robot state objects.
 *
 * @param {Array<{battery: number, cpuUsage: number, rssi: number}>} robots
 * @returns {{ averageBattery: number, averageCpu: number, averageRssi: number }}
 */
export function computeAggregates(robots) {
  if (!robots || robots.length === 0) {
    return { averageBattery: 0, averageCpu: 0, averageRssi: 0 };
  }

  const count = robots.length;
  const totals = robots.reduce(
    (acc, robot) => ({
      battery: acc.battery + robot.battery,
      cpuUsage: acc.cpuUsage + robot.cpuUsage,
      rssi: acc.rssi + robot.rssi,
    }),
    { battery: 0, cpuUsage: 0, rssi: 0 }
  );

  return {
    averageBattery: Math.round((totals.battery / count) * 100) / 100,
    averageCpu: Math.round((totals.cpuUsage / count) * 100) / 100,
    averageRssi: Math.round((totals.rssi / count) * 100) / 100,
  };
}
