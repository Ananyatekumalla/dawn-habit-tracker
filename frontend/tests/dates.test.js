import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, fastingHours, totalDays } from '../src/lib/dates.js';

describe('dates', () => {
  it('counts the challenge length inclusively', () => {
    expect(totalDays({ start: '2026-09-28', end: '2026-12-16' })).toBe(80);
  });
  it('adds days across months', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(daysBetween('2026-09-28', '2026-10-05')).toBe(7);
  });
  it('wraps fasting windows past midnight', () => {
    expect(fastingHours('20:00', '12:00')).toBe(16);
    expect(fastingHours('08:00', '12:00')).toBe(4);
  });
});
