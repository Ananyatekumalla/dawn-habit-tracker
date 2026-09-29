/**
 * Weekly treats: a week with at least `rewardDays` good days (score ≥ rewardScore)
 * earns a treat you pick from your rewards list. Mirrors _treat() in reports.py.
 */
import { ITEMS, sectionsFor } from '../config/goals.js';
import { allDates } from './dates.js';
import { dayScore, isLogged } from './scoring.js';

export function weekTreats({ settings, days, today }) {
  const dates = allDates(settings);
  const sections = sectionsFor(settings);
  const weeks = [];
  for (let w = 0; w * 7 < dates.length; w += 1) {
    const weekDates = dates.slice(w * 7, w * 7 + 7);
    const scores = weekDates.map((k) =>
      isLogged(ITEMS, days[k]) ? dayScore(sections, days[k], settings, k) : null,
    );
    const goodDays = scores.filter((s) => s !== null && s >= settings.rewardScore).length;
    const daysLeft = weekDates.filter((k) => k >= today).length;
    const chosen = settings.treats?.[String(w)] ?? {};
    const earned = goodDays >= settings.rewardDays;
    let status = 'upcoming';
    if (earned) status = 'earned';
    else if (weekDates[0] > today) status = 'upcoming';
    else if (goodDays + daysLeft < settings.rewardDays) status = 'missed';
    else status = 'progress';
    weeks.push({
      index: w,
      dates: weekDates,
      scores,
      goodDays,
      needed: settings.rewardDays,
      earned,
      status,
      rewardId: chosen.rewardId ?? '',
      enjoyed: Boolean(chosen.enjoyed),
      current: weekDates[0] <= today && today <= weekDates.at(-1),
    });
  }
  return weeks;
}

/** Returns new settings with a week's treat updated. */
export const setTreat = (settings, weekIndex, patch) => ({
  ...settings,
  treats: { ...settings.treats, [String(weekIndex)]: { ...settings.treats?.[String(weekIndex)], ...patch } },
});
