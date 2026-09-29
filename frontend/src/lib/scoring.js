/**
 * Daily scoring rules. Mirrors backend/app/services/scoring.py.
 * Both are tested against shared/scoring-cases.json. Change one, change both.
 */
import { daysBetween } from './dates.js';

export function studyTarget(settings, dateKey) {
  const week = Math.max(0, Math.floor(daysBetween(settings.start, dateKey) / 7));
  const stepsTaken = Math.floor(week / (settings.studyStepEveryWeeks ?? 2));
  const target = settings.studyFrom + (settings.studyStepHours ?? 0.5) * stepsTaken;
  return Math.min(settings.studyTo, target);
}

/**
 * Sections with the user's custom goals added. Each custom goal is worth
 * `rules.weight` points taken from its own section; built-in goals shrink so the
 * section still adds up to the same total. Mirrors effective_sections() in scoring.py.
 */
export function withCustomHabits(sections, settings, rules = { weight: 2.5, maxPerSection: 4 }) {
  const customs = settings.customHabits ?? [];
  if (!customs.length) return sections;
  return sections.map((section) => {
    const mine = customs.filter((h) => h.section === section.id).slice(0, rules.maxPerSection);
    if (!mine.length) return section;
    const total = sectionMax(section);
    const factor = (total - rules.weight * mine.length) / total;
    return {
      ...section,
      items: [
        ...section.items.map((item) => ({ ...item, weight: item.weight * factor })),
        ...mine.map((h) => ({
          id: h.id,
          name: h.name,
          custom: true,
          weight: rules.weight,
          type: h.type === 'count' ? 'count' : 'check',
          target: h.target || 1,
          unit: h.unit ?? '',
          time: h.time ?? '',
          step: 1,
        })),
      ],
    };
  });
}

const valueOf = (item, day) => (item.custom ? day?.custom?.[item.id] : day?.[item.id]);

export function itemTarget(item, settings, dateKey) {
  if (item.custom) return Number(item.target) || 1;
  if (item.targetKey === 'study') return studyTarget(settings, dateKey);
  return item.targetKey ? Number(settings[item.targetKey]) : 1;
}

/** How complete one habit is on one day, from 0 to 1. */
export function itemFraction(item, day, settings, dateKey) {
  const value = valueOf(item, day);
  if (item.type === 'check') return value ? 1 : 0;
  if (item.type === 'slots') return (value ?? []).filter(Boolean).length / item.slots;
  const target = itemTarget(item, settings, dateKey);
  return target > 0 ? Math.min(1, (value ?? 0) / target) : 0;
}

export const isItemDone = (item, day, settings, dateKey) =>
  itemFraction(item, day, settings, dateKey) >= 1;

export const sectionPoints = (section, day, settings, dateKey) =>
  section.items.reduce(
    (sum, item) => sum + itemFraction(item, day, settings, dateKey) * item.weight,
    0,
  );

export const sectionMax = (section) => section.items.reduce((sum, item) => sum + item.weight, 0);

export const dayScore = (sections, day, settings, dateKey) =>
  Math.round(sections.reduce((sum, s) => sum + sectionPoints(s, day, settings, dateKey), 0));

export function isLogged(items, day) {
  if (!day) return false;
  const anyHabit = items.some((item) => {
    const value = day[item.id];
    return Array.isArray(value) ? value.some(Boolean) : Boolean(value);
  });
  const anyCustom = Object.values(day.custom ?? {}).some(Boolean);
  return anyHabit || anyCustom || Boolean(day.journal);
}

/** Score band used for colours in the ring and the day grid. */
export function scoreLevel(score) {
  if (score === null || score === undefined) return 0;
  if (score >= 90) return 4;
  if (score >= 70) return 3;
  if (score >= 40) return 2;
  return 1;
}
