import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/config/goals.js';
import { buildSummary, movingAverage } from '../src/lib/summary.js';

const perfect = {
  wake: true, gym: true, breakfast: true, lunch: true, meds: 1, walkLunch: true, walkDinner: true,
  steps: 10000, apps: 5, naukri: [true, true, true], study: 4, fast: true, project: 2,
};

describe('buildSummary', () => {
  const summary = buildSummary({
    settings: DEFAULTS,
    days: { '2026-09-28': { ...perfect, weight: 64 }, '2026-09-29': perfect, '2026-09-30': { steps: 2000, weight: 63.4 } },
    topics: [{ id: 'a', track: 'mern', date: '2026-09-28', done: true, doneDate: '2026-09-29' }],
    today: '2026-10-01',
  });

  it('counts journey progress', () => {
    expect(summary.dayNumber).toBe(4);
    expect(summary.totalDays).toBe(80);
  });
  it('tracks streaks and totals', () => {
    // The streak counts any logged day (28th, 29th and 30th all have something logged);
    // today (Oct 1) has nothing yet but doesn't break a streak still in progress.
    expect(summary.bestStreak).toBe(3);
    expect(summary.currentStreak).toBe(3);
    expect(summary.totalApps).toBe(10);
    expect(summary.daysLogged).toBe(3);
  });
  it('tracks weight and project hours', () => {
    expect(summary.weightChange).toBe(-0.6);
    expect(summary.latestWeight).toBe(63.4);
    expect(summary.totalProjectHours).toBe(4);
  });

  it('counts covered topics in the week they were finished', () => {
    expect(summary.weeks[0].topics.mern).toBe(1);
    expect(summary.tracks.mern.pct).toBe(100);
  });
});

describe('movingAverage', () => {
  it('ignores gaps', () => {
    expect(movingAverage([10, null, 30], 7)).toEqual([10, 10, 20]);
  });
});
