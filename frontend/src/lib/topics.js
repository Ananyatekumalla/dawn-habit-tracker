/** Study topic helpers. Pure functions, no React. */

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const newTopic = ({ title, track, date = null, url = '' }) => ({
  id: makeId(),
  title: title.trim(),
  url,
  track,
  date,
  notes: '',
  done: false,
  doneDate: null,
});

/** Topics planned for one date. */
export const topicsOn = (topics, dateKey) => topics.filter((t) => t.date === dateKey);

/** Unfinished topics from earlier days, oldest first (unscheduled targets excluded). */
export const carriedOver = (topics, dateKey) =>
  topics
    .filter((t) => !t.done && t.date && t.date < dateKey)
    .sort((a, b) => a.date.localeCompare(b.date));

/** Targets not yet scheduled on any day and not done. */
export const backlog = (topics, trackId) =>
  topics.filter((t) => !t.date && !t.done && (!trackId || t.track === trackId));

const MAX_SLUG = 40;

/** 'SQL: Window Functions!' → 'sql-window-functions'. Mirrors targets.py. */
export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.slice(0, MAX_SLUG).replace(/-+$/, '') || 'item';
}

export const targetId = (trackId, title) => `tg-${trackId}-${slugify(title)}`;

/**
 * Targets from shared/goals.json that haven't been seeded on this device yet.
 * Deterministic ids keep this idempotent, and ids already seeded once are
 * skipped so a target you deleted doesn't come back.
 */
/** Targets are either a plain title or { title, url }. */
const asTarget = (entry) => (typeof entry === 'string' ? { title: entry.trim(), url: '' } : { title: entry.title.trim(), url: entry.url ?? '' });

export function targetsToSeed(tracks, existingIds, seededIds) {
  const newTopics = [];
  const newlySeeded = [];
  for (const track of tracks) {
    for (const entry of track.targets ?? []) {
      const { title, url } = asTarget(entry);
      const id = targetId(track.id, title);
      if (seededIds.has(id) || newlySeeded.includes(id)) continue;
      newlySeeded.push(id);
      if (!existingIds.has(id)) {
        newTopics.push({ id, track: track.id, title: title.slice(0, 200), url, notes: '', date: null, done: false, doneDate: null });
      }
    }
  }
  return { newTopics, newlySeeded };
}

/** Fill in course links on configured targets that don't have one (never overwrites yours). */
export function withTargetLinks(topics, tracks) {
  const links = new Map();
  for (const track of tracks) {
    for (const entry of track.targets ?? []) {
      const { title, url } = asTarget(entry);
      if (url) links.set(targetId(track.id, title), url);
    }
  }
  return topics.map((t) => (!t.url && links.has(t.id) ? { ...t, url: links.get(t.id) } : t));
}

/** Only http(s) links are shown or saved. Mirrors validation.py. */
export const isSafeUrl = (url) => /^https?:\/\/\S{3,}$/.test(url ?? '');

/** Turns a pasted list into clean titles: strips bullets/numbers, drops blanks and repeats. */
export function parseTargetList(text) {
  const titles = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•▪◦]|\d+[.)]|\[\s?[xX]?\])\s*/, '').trim())
    .filter(Boolean)
    .map((line) => line.slice(0, 200));
  return [...new Set(titles)];
}

export const coveredOn = (topics, dateKey) =>
  topics.filter((t) => t.done && (t.doneDate ?? t.date) === dateKey);

/** { trackId: { total, done, pct } } */
export function trackProgress(topics, tracks) {
  return Object.fromEntries(
    tracks.map((track) => {
      const mine = topics.filter((t) => t.track === track.id);
      const done = mine.filter((t) => t.done).length;
      return [track.id, { total: mine.length, done, pct: mine.length ? Math.round((done / mine.length) * 100) : 0 }];
    }),
  );
}

export function toggleDone(topic, todayKey) {
  const done = !topic.done;
  return { ...topic, done, doneDate: done ? todayKey : null };
}
