import { describe, it, expect } from 'vitest';
import { formatUptime } from './formatUptime.js';

describe('formatUptime', () => {
  it('returns "0d 0h 0m" for 0 seconds', () => {
    expect(formatUptime(0)).toBe('0d 0h 0m');
  });

  it('returns "0d 0h 1m" for 60 seconds', () => {
    expect(formatUptime(60)).toBe('0d 0h 1m');
  });

  it('returns "0d 1h 0m" for 3600 seconds', () => {
    expect(formatUptime(3600)).toBe('0d 1h 0m');
  });

  it('returns "1d 0h 0m" for exactly 86400 seconds', () => {
    expect(formatUptime(86400)).toBe('1d 0h 0m');
  });

  it('returns "1d 1h 1m" for 90061 seconds', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m');
  });

  it('returns "0d 0h 59m" for 3599 seconds', () => {
    expect(formatUptime(3599)).toBe('0d 0h 59m');
  });

  it('returns "0d 23h 59m" for 86399 seconds', () => {
    expect(formatUptime(86399)).toBe('0d 23h 59m');
  });

  it('handles large values correctly (30 days)', () => {
    // 30 days = 2592000 seconds
    expect(formatUptime(2592000)).toBe('30d 0h 0m');
  });

  it('handles large values with all components (10d 5h 30m)', () => {
    const seconds = 10 * 86400 + 5 * 3600 + 30 * 60;
    expect(formatUptime(seconds)).toBe('10d 5h 30m');
  });

  it('always includes all three components in output', () => {
    const result = formatUptime(3661); // 1h 1m 1s → "0d 1h 1m"
    expect(result).toBe('0d 1h 1m');
    const parts = result.split(' ');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^\d+d$/);
    expect(parts[1]).toMatch(/^\d+h$/);
    expect(parts[2]).toMatch(/^\d+m$/);
  });
});
