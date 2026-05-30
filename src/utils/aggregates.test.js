import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeAggregates } from './aggregates.js';

// --- Unit tests ---

describe('computeAggregates', () => {
  it('returns zeros for an empty array', () => {
    expect(computeAggregates([])).toEqual({
      averageBattery: 0,
      averageCpu: 0,
      averageRssi: 0,
    });
  });

  it('returns the single robot values when given one robot', () => {
    const robots = [{ battery: 80, cpuUsage: 45, rssi: -60 }];
    expect(computeAggregates(robots)).toEqual({
      averageBattery: 80,
      averageCpu: 45,
      averageRssi: -60,
    });
  });

  it('computes correct averages for multiple robots', () => {
    const robots = [
      { battery: 100, cpuUsage: 50, rssi: -40 },
      { battery: 60,  cpuUsage: 30, rssi: -80 },
    ];
    expect(computeAggregates(robots)).toEqual({
      averageBattery: 80,
      averageCpu: 40,
      averageRssi: -60,
    });
  });

  it('rounds averages to 2 decimal places', () => {
    const robots = [
      { battery: 100, cpuUsage: 0,  rssi: -10 },
      { battery: 0,   cpuUsage: 0,  rssi: -20 },
      { battery: 0,   cpuUsage: 0,  rssi: -30 },
    ];
    // averageBattery = 100/3 ≈ 33.33
    expect(computeAggregates(robots).averageBattery).toBe(33.33);
  });

  it('handles negative rssi values correctly', () => {
    const robots = [
      { battery: 50, cpuUsage: 50, rssi: -55 },
      { battery: 50, cpuUsage: 50, rssi: -65 },
      { battery: 50, cpuUsage: 50, rssi: -75 },
    ];
    expect(computeAggregates(robots).averageRssi).toBe(-65);
  });
});

// --- Property-based tests ---
// **Validates: Requirements 2.3**

describe('computeAggregates – properties', () => {
  const robotArb = fc.record({
    battery:  fc.float({ min: 0,    max: 100,  noNaN: true }),
    cpuUsage: fc.float({ min: 0,    max: 100,  noNaN: true }),
    rssi:     fc.float({ min: -120, max: -30,  noNaN: true }),
  });

  it('averages are within the range of the input values', () => {
    fc.assert(
      fc.property(fc.array(robotArb, { minLength: 1, maxLength: 50 }), (robots) => {
        const { averageBattery, averageCpu, averageRssi } = computeAggregates(robots);

        const minBattery  = Math.min(...robots.map((r) => r.battery));
        const maxBattery  = Math.max(...robots.map((r) => r.battery));
        const minCpu      = Math.min(...robots.map((r) => r.cpuUsage));
        const maxCpu      = Math.max(...robots.map((r) => r.cpuUsage));
        const minRssi     = Math.min(...robots.map((r) => r.rssi));
        const maxRssi     = Math.max(...robots.map((r) => r.rssi));

        return (
          averageBattery >= minBattery - 0.01 && averageBattery <= maxBattery + 0.01 &&
          averageCpu     >= minCpu     - 0.01 && averageCpu     <= maxCpu     + 0.01 &&
          averageRssi    >= minRssi    - 0.01 && averageRssi    <= maxRssi    + 0.01
        );
      })
    );
  });

  it('result values are rounded to at most 2 decimal places', () => {
    fc.assert(
      fc.property(fc.array(robotArb, { minLength: 1, maxLength: 50 }), (robots) => {
        const { averageBattery, averageCpu, averageRssi } = computeAggregates(robots);
        const twoDecimalPlaces = (n) => Math.abs(n - Math.round(n * 100) / 100) < 1e-9;
        return twoDecimalPlaces(averageBattery) && twoDecimalPlaces(averageCpu) && twoDecimalPlaces(averageRssi);
      })
    );
  });

  it('empty array always returns all zeros', () => {
    fc.assert(
      fc.property(fc.constant([]), (robots) => {
        const result = computeAggregates(robots);
        return result.averageBattery === 0 && result.averageCpu === 0 && result.averageRssi === 0;
      })
    );
  });
});
