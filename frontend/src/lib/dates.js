/** Date helpers. Days are identified by local ISO keys: "YYYY-MM-DD". */

const pad = (n) => String(n).padStart(2, '0');
const MS_PER_DAY = 86_400_000;

export const toKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (key, n) => {
  const date = fromKey(key);
  date.setDate(date.getDate() + n);
  return toKey(date);
};

export const daysBetween = (fromKeyStr, toKeyStr) =>
  Math.round((fromKey(toKeyStr) - fromKey(fromKeyStr)) / MS_PER_DAY);

export const totalDays = (settings) => daysBetween(settings.start, settings.end) + 1;

export const allDates = (settings) =>
  Array.from({ length: totalDays(settings) }, (_, i) => addDays(settings.start, i));

export const nowHM = (date = new Date()) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const minutesOf = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

export function formatTime(hm) {
  if (!hm) return '';
  const [h, m] = hm.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export const formatDate = (key, options = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  fromKey(key).toLocaleDateString(undefined, options);

/** Hours between last meal and first meal, wrapping past midnight. */
export function fastingHours(start, end) {
  if (!start || !end) return 0;
  let minutes = minutesOf(end) - minutesOf(start);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}
