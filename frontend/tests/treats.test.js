import { describe, expect, it } from 'vitest';
import { DEFAULTS } from '../src/config/goals.js';
import { addDays } from '../src/lib/dates.js';
import { setTreat, weekTreats } from '../src/lib/treats.js';

const good = { wake: true, gym: true, breakfast: true, lunch: true, apps: 5, naukri: [true, true, true], study: 4, project: 2 }; // 75

const daysWith = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [addDays('2026-09-28', i), good]));

describe('weekly treats', () => {
  it('earns a treat with 5 good days', () => {
    const [w] = weekTreats({ settings: DEFAULTS, days: daysWith(5), today: '2026-10-02' });
    expect(w.goodDays).toBe(5);
    expect(w.earned).toBe(true);
  });

  it('is still possible with days left', () => {
    const [w] = weekTreats({ settings: DEFAULTS, days: daysWith(2), today: '2026-09-30' });
    expect(w.status).toBe('progress');
  });

  it('is missed when too few days remain', () => {
    const [w] = weekTreats({ settings: DEFAULTS, days: daysWith(1), today: '2026-10-03' });
    expect(w.status).toBe('missed');
  });

  it('remembers the chosen treat', () => {
    const settings = setTreat(DEFAULTS, 0, { rewardId: 'icecream' });
    const [w] = weekTreats({ settings, days: daysWith(5), today: '2026-10-05' });
    expect(w.rewardId).toBe('icecream');
    expect(setTreat(settings, 0, { enjoyed: true }).treats['0'].rewardId).toBe('icecream');
  });
});
