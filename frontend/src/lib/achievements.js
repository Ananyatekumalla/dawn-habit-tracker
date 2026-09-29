/**
 * Achievements are unlocked automatically from what you log. Pure functions, no React.
 *
 * Weekly badges: earned when the rule is met on every day of that challenge week.
 * Milestones: one-off goals across the whole challenge.
 */
import { ITEMS, STUDY_TRACKS, sectionsFor } from '../config/goals.js';
import { allDates } from './dates.js';
import { dayScore, isItemDone, isLogged } from './scoring.js';
import { STREAK_SCORE } from './summary.js';
import { weekTreats } from './treats.js';

const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const done = (id, day, settings, date) => isItemDone(ITEM[id], day, settings, date);

/** Each weekly badge checks one day. `perfect` is special-cased as "every other badge". */
export const WEEKLY_BADGES = [
  { id: 'early', name: 'Early Bird', emoji: '🌅', color: '--sun', rule: 'Up on time every day', check: (d, s, k) => done('wake', d, s, k) },
  { id: 'gym', name: 'Iron Week', emoji: '🏋️', color: '--rose', rule: 'Gym every day', check: (d, s, k) => done('gym', d, s, k) },
  { id: 'chef', name: 'Home Chef', emoji: '🍳', color: '--sun', rule: 'Breakfast and lunch prepared every day', check: (d, s, k) => done('breakfast', d, s, k) && done('lunch', d, s, k) },
  { id: 'wellness', name: 'Wellness', emoji: '💊', color: '--leaf', rule: 'Medicines and both walks every day', check: (d, s, k) => ['meds', 'walkLunch', 'walkDinner'].every((id) => done(id, d, s, k)) },
  { id: 'steps', name: '10K Walker', emoji: '👟', color: '--leaf', rule: 'Steps goal every day', check: (d, s, k) => done('steps', d, s, k) },
  { id: 'jobs', name: 'Job Hunter', emoji: '💼', color: '--sky', rule: 'All applications and 3 Naukri updates every day', check: (d, s, k) => done('apps', d, s, k) && done('naukri', d, s, k) },
  { id: 'scholar', name: 'Scholar', emoji: '🎓', color: '--sky', rule: 'Study target hit every day', check: (d, s, k) => done('study', d, s, k) },
  { id: 'builder', name: 'Night Builder', emoji: '🛠️', color: '--rose', rule: 'Project hours hit every night', check: (d, s, k) => done('project', d, s, k) },
  { id: 'fast', name: 'Fasting Pro', emoji: '⏳', color: '--rose', rule: 'Fast completed every day', check: (d, s, k) => done('fast', d, s, k) },
  { id: 'journal', name: 'Storyteller', emoji: '📝', color: '--sky', rule: 'Journal written every day', check: (d) => Boolean(d.journal?.trim()) },
  { id: 'perfect', name: 'Perfect Week', emoji: '👑', color: '--sun', rule: 'A score of 100 every day', check: (d, s, k) => dayScore(sectionsFor(s), d, s, k) === 100 },
];

/** Topic Master is weekly but looks at topics, not days. */
export const TOPIC_BADGE = {
  id: 'topics',
  name: 'Topic Master',
  emoji: '📚',
  color: '--leaf',
  rule: 'Every topic planned this week covered, with at least one in each track',
};

function topicBadge(topics, weekDates) {
  const inWeek = new Set(weekDates);
  const planned = topics.filter((t) => inWeek.has(t.date));
  const covered = planned.filter((t) => t.done);
  const tracksCovered = STUDY_TRACKS.filter((tr) => covered.some((t) => t.track === tr.id)).length;
  const earned = planned.length > 0 && covered.length === planned.length && tracksCovered === STUDY_TRACKS.length;
  // Progress blends "tracks touched" and "planned covered" so it moves as you work.
  const progress = planned.length
    ? (tracksCovered / STUDY_TRACKS.length + covered.length / planned.length) / 2
    : 0;
  return { earned, progress, detail: `${covered.length}/${planned.length} topics · ${tracksCovered}/3 tracks` };
}

function weekStatus(earned, lastDate, firstDate, today) {
  if (earned) return 'earned';
  if (firstDate > today) return 'upcoming';
  if (lastDate < today) return 'missed';
  return 'progress';
}

export const TREAT_BADGE = { id: 'treat', name: 'Treat Week', emoji: '🎁', color: '--rose' };

export function evaluateWeeks({ settings, days, topics, today }) {
  const dates = allDates(settings);
  const treats = weekTreats({ settings, days, today });
  const weeks = [];
  for (let w = 0; w * 7 < dates.length; w += 1) {
    const weekDates = dates.slice(w * 7, w * 7 + 7);
    const first = weekDates[0];
    const last = weekDates.at(-1);

    const badges = WEEKLY_BADGES.map((badge) => {
      const met = weekDates.filter((k) => days[k] && badge.check(days[k], settings, k)).length;
      const earned = met === weekDates.length;
      return {
        ...badge,
        earned,
        progress: met / weekDates.length,
        detail: `${met}/${weekDates.length} days`,
        status: weekStatus(earned, last, first, today),
      };
    });

    const topic = topicBadge(topics, weekDates);
    badges.splice(badges.length - 1, 0, {
      ...TOPIC_BADGE,
      ...topic,
      status: weekStatus(topic.earned, last, first, today),
    });

    const treat = treats[w];
    badges.unshift({
      ...TREAT_BADGE,
      rule: `${settings.rewardDays} of 7 days scoring ${settings.rewardScore}+ earns a treat`,
      earned: treat.earned,
      progress: Math.min(1, treat.goodDays / treat.needed),
      detail: `${treat.goodDays}/${treat.needed} good days`,
      status: treat.status,
    });

    weeks.push({
      index: w,
      label: `Week ${w + 1}`,
      first,
      last,
      badges,
      earnedCount: badges.filter((b) => b.earned).length,
      current: first <= today && today <= last,
    });
  }
  return weeks;
}

/** One-off goals across the whole challenge. `value` and `goal` drive the progress bar. */
export function evaluateMilestones({ settings, days, topics, today }) {
  const dates = allDates(settings).filter((d) => d <= today);
  const logged = dates.filter((k) => isLogged(ITEMS, days[k]));
  const scores = logged.map((k) => dayScore(sectionsFor(settings), days[k], settings, k));

  let run = 0;
  let best = 0;
  for (const k of dates) {
    const ok = isLogged(ITEMS, days[k]) && dayScore(sectionsFor(settings), days[k], settings, k) >= STREAK_SCORE;
    if (ok) run += 1;
    else if (k !== today) run = 0; // today doesn't break a streak while it's in progress
    best = Math.max(best, run);
  }

  const sum = (field) => dates.reduce((acc, k) => acc + (days[k]?.[field] ?? 0), 0);
  const naukri = dates.reduce((acc, k) => acc + (days[k]?.naukri ?? []).filter(Boolean).length, 0);
  const covered = topics.filter((t) => t.done).length;
  const finalLogged = isLogged(ITEMS, days[settings.end]);

  const list = [
    { id: 'first', name: 'First Light', emoji: '✨', color: '--sun', rule: 'Log your first day', value: logged.length, goal: 1 },
    { id: 'perfectday', name: 'Flawless', emoji: '💯', color: '--sun', rule: 'Score 100 on any day', value: Math.max(0, ...scores), goal: 100 },
    { id: 'streak7', name: 'On a Roll', emoji: '🔥', color: '--rose', rule: '7 days in a row scoring 70+', value: best, goal: 7 },
    { id: 'streak21', name: 'Unstoppable', emoji: '🚀', color: '--rose', rule: '21 days in a row scoring 70+', value: best, goal: 21 },
    { id: 'apps100', name: 'Century', emoji: '📮', color: '--sky', rule: 'Send 100 job applications', value: sum('apps'), goal: 100 },
    { id: 'naukri60', name: 'Always Fresh', emoji: '🔄', color: '--sky', rule: '60 Naukri profile updates', value: naukri, goal: 60 },
    { id: 'topics50', name: 'Bookworm', emoji: '📖', color: '--leaf', rule: 'Cover 50 study topics', value: covered, goal: 50 },
    { id: 'hours200', name: 'Deep Worker', emoji: '🧠', color: '--leaf', rule: 'Study 200 hours in total', value: sum('study'), goal: 200 },
    { id: 'build100', name: 'Maker', emoji: '🚢', color: '--rose', rule: 'Spend 100 hours on your night projects', value: sum('project'), goal: 100 },
    { id: 'steps500k', name: 'Marathoner', emoji: '🏃', color: '--leaf', rule: 'Walk 500,000 steps in total', value: sum('steps'), goal: 500_000 },
    { id: 'finish', name: 'Finish Line', emoji: '🏁', color: '--sun', rule: 'Log the final day of the challenge', value: finalLogged ? 1 : 0, goal: 1 },
  ];
  return list.map((m) => ({ ...m, earned: m.value >= m.goal, progress: Math.min(1, m.value / m.goal) }));
}

/** Stable ids of everything earned, used to spot new unlocks. */
export function earnedIds(weeks, milestones) {
  return [
    ...weeks.flatMap((w) => w.badges.filter((b) => b.earned).map((b) => `w${w.index + 1}:${b.id}`)),
    ...milestones.filter((m) => m.earned).map((m) => `m:${m.id}`),
  ];
}
