import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computeReconnectDelay } from './reconnectDelay.js';

describe('computeReconnectDelay', () => {
  // Unit tests for specific examples
  it('returns 1000ms for attempt 0', () => {
    expect(computeReconnectDelay(0)).toBe(1000);
  });

  it('returns 2000ms for attempt 1', () => {
    expect(computeReconnectDelay(1)).toBe(2000);
  });

  it('returns 4000ms for attempt 2', () => {
    expect(computeReconnectDelay(2)).toBe(4000);
  });

  it('returns 8000ms for attempt 3', () => {
    expect(computeReconnectDelay(3)).toBe(8000);
  });

  it('returns 16000ms for attempt 4', () => {
    expect(computeReconnectDelay(4)).toBe(16000);
  });

  it('returns 30000ms (capped) for attempt 5', () => {
    expect(computeReconnectDelay(5)).toBe(30000);
  });

  it('returns 30000ms (capped) for attempt 9', () => {
    expect(computeReconnectDelay(9)).toBe(30000);
  });

  // Property-based tests
  // **Validates: Requirements 9.3**
  it('never exceeds 30000ms for any non-negative attempt', () => {
    fc.assert(
      fc.property(fc.nat({ max: 100 }), (attempt) => {
        return computeReconnectDelay(attempt) <= 30000;
      })
    );
  });

  // **Validates: Requirements 9.3**
  it('always returns at least 1000ms for any non-negative attempt', () => {
    fc.assert(
      fc.property(fc.nat({ max: 100 }), (attempt) => {
        return computeReconnectDelay(attempt) >= 1000;
      })
    );
  });

  // **Validates: Requirements 9.3**
  it('is non-decreasing as attempt increases', () => {
    fc.assert(
      fc.property(fc.nat({ max: 50 }), (attempt) => {
        return computeReconnectDelay(attempt) <= computeReconnectDelay(attempt + 1);
      })
    );
  });
});
