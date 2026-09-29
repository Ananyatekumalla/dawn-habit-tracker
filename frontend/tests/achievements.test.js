import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/config/goals.js';
import { earnedIds, evaluateMilestones, evaluateWeeks } from '../src/lib/achievements.js';
import { addDays } from '../src/lib/dates.js';

const perfect = {
  wake: true, gym: true, breakfast: true, lunch: true, meds: 1, walkLunch: true, walkDinner: true,
  steps: 10000, apps: 5, naukri: [true, true, true], study: 4, fast: true, project: 2, journal: 'Good day',
};
const week1 = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [addDays('2026-09-28', i), perfect]));
const topics = [
  { id: 'a', track: 'data', date: '2026-09-28', done: true },
  { id: 'b', track: 'mern', date: '2026-09-29', done: true },
  { id: 'c', track: 'ai', date: '2026-09-30', done: true },
];

describe('weekly badges', () => {
  const weeks = evaluateWeeks({ settings: DEFAULTS, days: week1, topics, today: '2026-10-05' });

  it('earns every badge for a perfect week', () => {
    expect(weeks[0].earnedCount).toBe(13);
    expect(weeks[0].badges.every((b) => b.status === 'earned')).toBe(true);
  });

  it('marks later weeks as upcoming', () => {
    expect(weeks[1].badges[0].status).toBe('progress'); // Oct 5 starts week 2
    expect(weeks[2].badges[0].status).toBe('upcoming');
    expect(weeks.length).toBe(12);
  });

  it('misses a badge when one day is short, and shows progress', () => {
    const days = { ...week1, '2026-10-01': { ...perfect, gym: false } };
    const [w] = evaluateWeeks({ settings: DEFAULTS, days, topics, today: '2026-10-05' });
    const gym = w.badges.find((b) => b.id === 'gym');
    expect(gym.earned).toBe(false);
    expect(gym.status).toBe('missed');
    expect(gym.detail).toBe('6/7 days');
    expect(w.badges.find((b) => b.id === 'perfect').earned).toBe(false);
  });

  it('needs every track for Topic Master', () => {
    const [w] = evaluateWeeks({ settings: DEFAULTS, days: week1, topics: topics.slice(0, 2), today: '2026-10-05' });
    expect(w.badges.find((b) => b.id === 'topics').earned).toBe(false);
  });
});

describe('milestones', () => {
  it('tracks streaks and totals', () => {
    const ms = evaluateMilestones({ settings: DEFAULTS, days: week1, topics, today: '2026-10-05' });
    const byId = Object.fromEntries(ms.map((m) => [m.id, m]));
    expect(byId.first.earned).toBe(true);
    expect(byId.perfectday.earned).toBe(true);
    expect(byId.streak7.earned).toBe(true);
    expect(byId.streak21.earned).toBe(false);
    expect(byId.apps100.value).toBe(35);
  });

  it('lists earned ids for unlock detection', () => {
    const weeks = evaluateWeeks({ settings: DEFAULTS, days: week1, topics, today: '2026-10-05' });
    const ms = evaluateMilestones({ settings: DEFAULTS, days: week1, topics, today: '2026-10-05' });
    const ids = earnedIds(weeks, ms);
    expect(ids.includes('w1:perfect')).toBe(true);
    expect(ids.includes('m:streak7')).toBe(true);
  });
});
