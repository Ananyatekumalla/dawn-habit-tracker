/**
 * Watches the clock and queues alerts for reminders that just became due.
 * Alerts only fire while the app is open; system notifications are used when allowed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildReminders, reminderStates } from '../lib/reminders.js';
import { formatTime, minutesOf, nowHM, toKey } from '../lib/dates.js';

const MAX_LATE_MINUTES = 90; // don't nag about things long past
const SNOOZE_MS = 15 * 60_000;

function notify(reminder) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Dawn · ${formatTime(reminder.time)}`, { body: reminder.label });
    }
  } catch {
    // Some browsers block notifications inside frames; the in-app alert still shows.
  }
}

export function useReminders(settings, day, now) {
  const currentHM = nowHM(now);
  const dateKey = toKey(now);
  const reminders = useMemo(
    () => (settings.remindersEnabled === false ? [] : reminderStates(buildReminders(settings, day), currentHM)),
    [settings, day, currentHM],
  );

  const [queue, setQueue] = useState([]);
  const seen = useRef({ dateKey, ids: new Set() });

  useEffect(() => {
    if (seen.current.dateKey !== dateKey) seen.current = { dateKey, ids: new Set() };
    const fresh = reminders.filter((r) => {
      if (r.state !== 'due' || seen.current.ids.has(r.id)) return false;
      seen.current.ids.add(r.id);
      return minutesOf(currentHM) - minutesOf(r.time) <= MAX_LATE_MINUTES;
    });
    if (fresh.length) {
      fresh.forEach(notify);
      setQueue((q) => [...q, ...fresh.map((r) => r.id)]);
    }
  }, [reminders, currentHM, dateKey]);

  const byId = useMemo(() => Object.fromEntries(reminders.map((r) => [r.id, r])), [reminders]);
  const activeId = queue.find((id) => byId[id] && byId[id].state !== 'done');
  const active = activeId ? byId[activeId] : null;

  const dismiss = useCallback(() => setQueue((q) => q.filter((id) => id !== activeId)), [activeId]);
  const snooze = useCallback(() => {
    const id = activeId;
    setQueue((q) => q.filter((x) => x !== id));
    setTimeout(() => setQueue((q) => [...q, id]), SNOOZE_MS);
  }, [activeId]);

  return { reminders, active, dismiss, snooze };
}
