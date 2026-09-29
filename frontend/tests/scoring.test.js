import { describe, expect, it } from 'vitest';
import cases from '@shared/scoring-cases.json';
import { SECTIONS, ITEMS } from '../src/config/goals.js';
import { dayScore, isLogged, sectionMax, studyTarget, withCustomHabits } from '../src/lib/scoring.js';

describe('study target ramp', () => {
  it.each(cases.studyTargets)('$date → $expected h', ({ date, expected }) => {
    expect(studyTarget(cases.settings, date)).toBe(expected);
  });
});

describe('day score (shared with Python)', () => {
  it.each(cases.dayScores)('$name', ({ day, date, expected }) => {
    expect(dayScore(SECTIONS, day, cases.settings, date)).toBe(expected);
  });

  it('weights add up to 100', () => {
    expect(SECTIONS.reduce((sum, s) => sum + sectionMax(s), 0)).toBe(100);
  });
});

describe('isLogged', () => {
  it('ignores empty days and unticked slots', () => {
    expect(isLogged(ITEMS, {})).toBe(false);
    expect(isLogged(ITEMS, { naukri: [false, false, false] })).toBe(false);
    expect(isLogged(ITEMS, { steps: 1200 })).toBe(true);
  });
});

describe('custom goals (shared with Python)', () => {
  const settings = { ...cases.settings, customHabits: cases.customCases.customHabits };
  const sections = withCustomHabits(SECTIONS, settings);

  it.each(cases.customCases.dayScores)('$name', ({ day, date, expected }) => {
    expect(dayScore(sections, day, settings, date)).toBe(expected);
  });

  it('keeps the total at 100', () => {
    expect(Math.round(sections.reduce((sum, s) => sum + sectionMax(s), 0))).toBe(100);
  });

  it('counts custom values as logged', () => {
    expect(isLogged(ITEMS, { custom: { water: true } })).toBe(true);
  });
});
