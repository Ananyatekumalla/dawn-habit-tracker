/**
 * Everything the Home dashboard shows, computed on the device so it's instant
 * and works offline. Pure function: (settings, days, topics, today) → summary.
 */
import { ITEMS, STUDY_TRACKS, sectionsFor } from '../config/goals.js';
import { allDates, daysBetween, totalDays } from './dates.js';
import { dayScore, isLogged, sectionMax, sectionPoints, studyTarget } from './scoring.js';
import { trackProgress } from './topics.js';

export const STREAK_SCORE = 70;

/** Current & best streak of 70+ scoring days, without the rest of buildSummary's work. */
export function computeStreak({ settings, days, today }) {
  const dates = allDates(settings).filter((d) => d <= today);
  let run = 0;
  let best = 0;
  for (const date of dates) {
    const day = days[date];
    const logged = isLogged(ITEMS, day);
    const score = logged ? dayScore(sectionsFor(settings), day, settings, date) : null;
    if (logged && score >= STREAK_SCORE) run += 1;
    else if (date !== today) run = 0;
    best = Math.max(best, run);
  }
  return { currentStreak: run, bestStreak: best };
}

/** Most recent days before today with nothing logged, newest first — days worth catching up on. */
export function recentMissedDays({ settings, days, today, limit = 3 }) {
  const past = allDates(settings).filter((d) => d < today);
  const missed = past.filter((d) => !isLogged(ITEMS, days[d]));
  return missed.slice(-limit).reverse();
}

export function buildSummary({ settings, days, topics, today }) {
  const dates = allDates(settings);
  const soFar = dates.filter((d) => d <= today);
  const rows = soFar.map((date) => {
    const day = days[date];
    const logged = isLogged(ITEMS, day);
    return { date, day: day ?? {}, logged, score: logged ? dayScore(sectionsFor(settings), day, settings, date) : null };
  });
  const logged = rows.filter((r) => r.logged);
  const sum = (list, fn) => list.reduce((acc, r) => acc + fn(r), 0);
  const avg = (list, fn) => (list.length ? sum(list, fn) / list.length : 0);

  // Streak of 70+ days; today doesn't break it while it's still in progress.
  let run = 0;
  let best = 0;
  for (const r of rows) {
    if (r.logged && r.score >= STREAK_SCORE) run += 1;
    else if (r.date !== today) run = 0;
    best = Math.max(best, run);
  }

  const weekCount = Math.ceil(dates.length / 7);
  const currentWeek = Math.min(weekCount - 1, Math.max(0, Math.floor(daysBetween(settings.start, today) / 7)));
  const weeks = Array.from({ length: currentWeek + 1 }, (_, w) => {
    const weekDates = dates.slice(w * 7, w * 7 + 7);
    const weekRows = rows.filter((r) => weekDates.includes(r.date));
    const weekLogged = weekRows.filter((r) => r.logged);
    return {
      label: `W${w + 1}`,
      avgScore: Math.round(avg(weekLogged, (r) => r.score)),
      studyHours: sum(weekRows, (r) => r.day.study ?? 0),
      projectHours: sum(weekRows, (r) => r.day.project ?? 0),
      studyTarget: sum(weekDates.map((date) => ({ date })), (r) => studyTarget(settings, r.date)),
      topics: Object.fromEntries(
        STUDY_TRACKS.map((t) => [
          t.id,
          topics.filter((x) => x.track === t.id && x.done && weekDates.includes(x.doneDate ?? x.date)).length,
        ]),
      ),
    };
  });

  const sections = sectionsFor(settings).map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    pct: logged.length
      ? Math.round((sum(logged, (r) => sectionPoints(s, r.day, settings, r.date)) / (sectionMax(s) * logged.length)) * 100)
      : 0,
  }));

  const weights = rows.filter((r) => r.day.weight).map((r) => ({ date: r.date, weight: r.day.weight }));
  const weightChange =
    weights.length > 1 ? Math.round((weights.at(-1).weight - weights[0].weight) * 10) / 10 : null;

  const dayNumber = Math.min(totalDays(settings), Math.max(0, daysBetween(settings.start, today) + 1));
  return {
    dayNumber,
    totalDays: totalDays(settings),
    journeyPct: Math.round((dayNumber / totalDays(settings)) * 100),
    todayScore: rows.find((r) => r.date === today)?.score ?? 0,
    avgScore: Math.round(avg(logged, (r) => r.score)),
    daysLogged: logged.length,
    currentStreak: run,
    bestStreak: best,
    totalApps: sum(rows, (r) => r.day.apps ?? 0),
    totalStudyHours: sum(rows, (r) => r.day.study ?? 0),
    totalProjectHours: sum(rows, (r) => r.day.project ?? 0),
    weights,
    weightChange,
    latestWeight: weights.at(-1)?.weight ?? null,
    avgSteps: Math.round(avg(logged, (r) => r.day.steps ?? 0)),
    gymDays: rows.filter((r) => r.day.gym).length,
    earlyDays: rows.filter((r) => r.day.wake).length,
    scores: rows.map((r) => ({ date: r.date, score: r.score })),
    weeks,
    sections,
    tracks: trackProgress(topics, STUDY_TRACKS),
    topicsDone: topics.filter((t) => t.done).length,
  };
}

/** 7-day moving average that skips unlogged days. */
export function movingAverage(values, window = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v) => v !== null);
    return slice.length ? Math.round(slice.reduce((a, b) => a + b, 0) / slice.length) : null;
  });
}
