import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterMetricsForRange } from './metricsFilter.js';

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('filterMetricsForRange', () => {
  it('returns empty array when points is empty', () => {
    expect(filterMetricsForRange([], 0, 1000)).toEqual([]);
  });

  it('returns empty array when points is null', () => {
    expect(filterMetricsForRange(null, 0, 1000)).toEqual([]);
  });

  it('returns empty array when no points fall in range', () => {
    const points = [
      { timestamp: 100, value: 1 },
      { timestamp: 200, value: 2 },
    ];
    expect(filterMetricsForRange(points, 300, 500)).toEqual([]);
  });

  it('includes points exactly on the from boundary (inclusive)', () => {
    const points = [{ timestamp: 500, value: 42 }];
    const result = filterMetricsForRange(points, 500, 1000);
    expect(result).toEqual([{ timestamp: 500, value: 42 }]);
  });

  it('includes points exactly on the to boundary (inclusive)', () => {
    const points = [{ timestamp: 1000, value: 99 }];
    const result = filterMetricsForRange(points, 500, 1000);
    expect(result).toEqual([{ timestamp: 1000, value: 99 }]);
  });

  it('excludes points just outside the range', () => {
    const points = [
      { timestamp: 499, value: 1 },
      { timestamp: 500, value: 2 },
      { timestamp: 1000, value: 3 },
      { timestamp: 1001, value: 4 },
    ];
    const result = filterMetricsForRange(points, 500, 1000);
    expect(result).toEqual([
      { timestamp: 500, value: 2 },
      { timestamp: 1000, value: 3 },
    ]);
  });

  it('preserves original order of points', () => {
    const points = [
      { timestamp: 700, value: 'c' },
      { timestamp: 500, value: 'a' },
      { timestamp: 600, value: 'b' },
    ];
    const result = filterMetricsForRange(points, 500, 700);
    expect(result.map((p) => p.value)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const points = [
      { timestamp: 100, value: 1 },
      { timestamp: 200, value: 2 },
      { timestamp: 300, value: 3 },
    ];
    const original = [...points];
    filterMetricsForRange(points, 150, 250);
    expect(points).toEqual(original);
  });

  it('returns all points when all fall within range', () => {
    const points = [
      { timestamp: 100, value: 1 },
      { timestamp: 200, value: 2 },
      { timestamp: 300, value: 3 },
    ];
    expect(filterMetricsForRange(points, 50, 400)).toEqual(points);
  });

  it('works when from equals to (single-point range)', () => {
    const points = [
      { timestamp: 200, value: 'match' },
      { timestamp: 300, value: 'no' },
    ];
    expect(filterMetricsForRange(points, 200, 200)).toEqual([
      { timestamp: 200, value: 'match' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// Feature: dexbot-control-dashboard, Property 11: filterMetricsForRange
// ---------------------------------------------------------------------------

/**
 * Validates: Requirements 11.1, 11.2, 11.3, 11.5
 */
describe('filterMetricsForRange — property-based tests', () => {
  // Arbitrary for a single metric point
  const pointArb = fc.record({
    timestamp: fc.integer({ min: 0, max: 1_000_000 }),
    value: fc.anything(),
  });

  // Arbitrary for a valid [from, to] range where from <= to
  const rangeArb = fc
    .tuple(
      fc.integer({ min: 0, max: 1_000_000 }),
      fc.integer({ min: 0, max: 1_000_000 })
    )
    .map(([a, b]) => (a <= b ? [a, b] : [b, a]));

  it('every returned point has timestamp within [from, to]', () => {
    fc.assert(
      fc.property(fc.array(pointArb), rangeArb, (points, [from, to]) => {
        const result = filterMetricsForRange(points, from, to);
        return result.every(
          (p) => p.timestamp >= from && p.timestamp <= to
        );
      }),
      { numRuns: 200 }
    );
  });

  it('every in-range point from the input appears in the result', () => {
    fc.assert(
      fc.property(fc.array(pointArb), rangeArb, (points, [from, to]) => {
        const result = filterMetricsForRange(points, from, to);
        const inRange = points.filter(
          (p) => p.timestamp >= from && p.timestamp <= to
        );
        // Same length — no points dropped or added
        return result.length === inRange.length;
      }),
      { numRuns: 200 }
    );
  });

  it('result is a subset of the input (no new points introduced)', () => {
    fc.assert(
      fc.property(fc.array(pointArb), rangeArb, (points, [from, to]) => {
        const result = filterMetricsForRange(points, from, to);
        return result.every((rp) =>
          points.some((p) => p === rp)
        );
      }),
      { numRuns: 200 }
    );
  });

  it('result preserves relative order of points from the input', () => {
    fc.assert(
      fc.property(fc.array(pointArb), rangeArb, (points, [from, to]) => {
        const result = filterMetricsForRange(points, from, to);
        // Build index map from original array
        const indices = result.map((rp) => points.indexOf(rp));
        // Indices must be strictly increasing (preserves order)
        for (let i = 1; i < indices.length; i++) {
          if (indices[i] <= indices[i - 1]) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  it('does not mutate the input array', () => {
    fc.assert(
      fc.property(fc.array(pointArb), rangeArb, (points, [from, to]) => {
        const snapshot = points.map((p) => ({ ...p }));
        filterMetricsForRange(points, from, to);
        return (
          points.length === snapshot.length &&
          points.every((p, i) => p.timestamp === snapshot[i].timestamp)
        );
      }),
      { numRuns: 200 }
    );
  });

  it('returns empty array for empty input regardless of range', () => {
    fc.assert(
      fc.property(rangeArb, ([from, to]) => {
        return filterMetricsForRange([], from, to).length === 0;
      }),
      { numRuns: 100 }
    );
  });
});
