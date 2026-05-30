import { describe, it, expect } from 'vitest';
import { aggregateByHour } from './hourlyAggregator.js';

// Helper: build a Unix ms timestamp for a specific UTC date/time
function utcMs(year, month, day, hour, minute = 0, second = 0) {
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

describe('aggregateByHour', () => {
  it('returns empty array for empty input', () => {
    expect(aggregateByHour([])).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(aggregateByHour(null)).toEqual([]);
    expect(aggregateByHour(undefined)).toEqual([]);
  });

  it('buckets a single event correctly', () => {
    const ts = utcMs(2024, 1, 15, 14, 30);
    const result = aggregateByHour([{ timestamp: ts }]);
    expect(result).toHaveLength(1);
    expect(result[0].hourKey).toBe('2024-01-15T14');
    expect(result[0].count).toBe(1);
    expect(result[0].timestamp).toBe(utcMs(2024, 1, 15, 14, 0, 0));
  });

  it('groups multiple events in the same UTC hour into one bucket', () => {
    const events = [
      { timestamp: utcMs(2024, 1, 15, 14, 0) },
      { timestamp: utcMs(2024, 1, 15, 14, 30) },
      { timestamp: utcMs(2024, 1, 15, 14, 59) },
    ];
    const result = aggregateByHour(events);
    expect(result).toHaveLength(1);
    expect(result[0].hourKey).toBe('2024-01-15T14');
    expect(result[0].count).toBe(3);
  });

  it('creates separate buckets for different UTC hours', () => {
    const events = [
      { timestamp: utcMs(2024, 1, 15, 13, 45) },
      { timestamp: utcMs(2024, 1, 15, 14, 10) },
      { timestamp: utcMs(2024, 1, 15, 15, 0) },
    ];
    const result = aggregateByHour(events);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.hourKey)).toEqual([
      '2024-01-15T13',
      '2024-01-15T14',
      '2024-01-15T15',
    ]);
    result.forEach(r => expect(r.count).toBe(1));
  });

  it('creates separate buckets for different UTC days', () => {
    const events = [
      { timestamp: utcMs(2024, 1, 14, 23, 59) },
      { timestamp: utcMs(2024, 1, 15, 0, 0) },
    ];
    const result = aggregateByHour(events);
    expect(result).toHaveLength(2);
    expect(result[0].hourKey).toBe('2024-01-14T23');
    expect(result[1].hourKey).toBe('2024-01-15T00');
  });

  it('returns results sorted ascending by hourKey', () => {
    const events = [
      { timestamp: utcMs(2024, 3, 1, 10) },
      { timestamp: utcMs(2024, 1, 1, 5) },
      { timestamp: utcMs(2024, 2, 15, 22) },
    ];
    const result = aggregateByHour(events);
    const keys = result.map(r => r.hourKey);
    expect(keys).toEqual([...keys].sort());
  });

  it('total count across all buckets equals number of input events', () => {
    const events = [
      { timestamp: utcMs(2024, 6, 1, 0) },
      { timestamp: utcMs(2024, 6, 1, 0, 30) },
      { timestamp: utcMs(2024, 6, 1, 1) },
      { timestamp: utcMs(2024, 6, 2, 0) },
    ];
    const result = aggregateByHour(events);
    const total = result.reduce((sum, r) => sum + r.count, 0);
    expect(total).toBe(events.length);
  });

  it('bucket timestamp is the Unix ms of the start of the UTC hour', () => {
    const ts = utcMs(2024, 6, 15, 9, 45, 30);
    const result = aggregateByHour([{ timestamp: ts }]);
    expect(result[0].timestamp).toBe(utcMs(2024, 6, 15, 9, 0, 0));
  });

  it('handles midnight boundary (hour 00) correctly', () => {
    const ts = utcMs(2024, 1, 1, 0, 0, 0);
    const result = aggregateByHour([{ timestamp: ts }]);
    expect(result[0].hourKey).toBe('2024-01-01T00');
  });

  it('handles end-of-day hour (23) correctly', () => {
    const ts = utcMs(2024, 12, 31, 23, 59, 59);
    const result = aggregateByHour([{ timestamp: ts }]);
    expect(result[0].hourKey).toBe('2024-12-31T23');
  });

  it('handles month/year boundaries correctly', () => {
    const events = [
      { timestamp: utcMs(2023, 12, 31, 23, 59) },
      { timestamp: utcMs(2024, 1, 1, 0, 0) },
    ];
    const result = aggregateByHour(events);
    expect(result).toHaveLength(2);
    expect(result[0].hourKey).toBe('2023-12-31T23');
    expect(result[1].hourKey).toBe('2024-01-01T00');
  });
});
