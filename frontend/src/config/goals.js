/**
 * Goals come from shared/goals.json, the same file the Python backend reads.
 * Add UI-only details (hint text) here; keep scoring rules in the JSON.
 */
import goals from '@shared/goals.json';
import { formatTime } from '../lib/dates.js';
import { studyTarget, withCustomHabits } from '../lib/scoring.js';

export const DEFAULTS = goals.defaults;
export const SECTIONS = goals.sections;
export const PROMPTS = goals.prompts;
export const STUDY_TRACKS = goals.studyTracks;
export const PROJECTS = goals.projects ?? [];
export const projectById = (id) => PROJECTS.find((p) => p.id === id);
export const LEGACY_DEFAULTS = goals.legacyDefaults ?? {};
export const CUSTOM_RULES = goals.customHabitRules ?? { weight: 2.5, maxPerSection: 4 };

/** Sections including this person's custom goals (cached per settings object). */
const sectionCache = new WeakMap();
export function sectionsFor(settings) {
  if (!sectionCache.has(settings)) sectionCache.set(settings, withCustomHabits(SECTIONS, settings, CUSTOM_RULES));
  return sectionCache.get(settings);
}

/** Emoji mood for a day's score: the higher the score, the happier. */
export const MOODS = [
  { min: 100, emoji: '🥳', label: 'Perfect day!' },
  { min: 90, emoji: '🤩', label: 'Amazing' },
  { min: 70, emoji: '😄', label: 'Great' },
  { min: 50, emoji: '😊', label: 'Good' },
  { min: 25, emoji: '🙂', label: 'Getting there' },
  { min: 1, emoji: '😐', label: 'Just started' },
  { min: 0, emoji: '😴', label: 'Still sleepy' },
];
export const moodFor = (score) => MOODS.find((m) => (score ?? 0) >= m.min);

/** Upgrade values that still equal an old default (mirrors routes/helpers.py). */
export function upgradeSettings(settings) {
  const next = { ...DEFAULTS, ...settings };
  for (const [key, oldValues] of Object.entries(LEGACY_DEFAULTS)) {
    if (oldValues.some((old) => JSON.stringify(old) === JSON.stringify(next[key]))) next[key] = DEFAULTS[key];
  }
  return next;
}
export const ITEMS = SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.id })),
);

/** Short helper text under each habit. Receives (settings, dateKey). */
export const HINTS = {
  wake: (s) => `By ${formatTime(s.wake)}`,
  gym: () => 'Any workout counts',
  breakfast: () => 'Cook it yourself',
  lunch: () => 'Packed and ready',
  meds: (s) => (s.meds > 1 ? `${s.meds} doses` : "Don't skip it"),
  walkLunch: (s) => `Around ${formatTime(s.lunchWalk)}`,
  walkDinner: (s) => `Around ${formatTime(s.dinnerWalk)}`,
  steps: (s) => `Goal ${s.steps.toLocaleString()}`,
  apps: (s) => `${s.apps} by end of day`,
  naukri: () => '3 times a day',
  study: (s, dateKey) => `Target ${studyTarget(s, dateKey)} hours`,
  project: (s) => `${s.projectHours}h tonight${projectById(s.currentProject) ? ` · ${projectById(s.currentProject).title}` : ''}`,
  fast: (s) => `${s.fast} hours`,
};
