import { describe, expect, it } from 'vitest';
import { daysBetween, isoDateOffset, today, toISODate, weekStart } from '../src/lib/dates.js';

describe('dates', () => {
  it('formats the local calendar date, not the UTC one', () => {
    // 11:30 PM local on Mar 9 is still Mar 9 locally, whatever the UTC date is.
    const lateEvening = new Date(2026, 2, 9, 23, 30);
    expect(toISODate(lateEvening)).toBe('2026-03-09');
    expect(today(lateEvening)).toBe('2026-03-09');
  });

  it('counts whole days across month, year and DST boundaries', () => {
    expect(daysBetween('2026-01-30', '2026-02-02')).toBe(3);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetween('2026-03-07', '2026-03-10')).toBe(3); // US DST starts Mar 8
    expect(daysBetween('2026-03-10', '2026-03-07')).toBe(-3);
  });

  it('offsets dates relative to a reference day', () => {
    const ref = new Date(2026, 0, 2, 9);
    expect(isoDateOffset(1, ref)).toBe('2026-01-01');
    expect(isoDateOffset(2, ref)).toBe('2025-12-31');
    expect(isoDateOffset(-1, ref)).toBe('2026-01-03');
  });

  it('finds the Sunday that starts the week', () => {
    expect(weekStart(new Date(2026, 9, 16))).toBe('2026-10-11'); // Fri → Sun
    expect(weekStart(new Date(2026, 9, 11))).toBe('2026-10-11'); // Sun → itself
  });
});
