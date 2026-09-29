/**
 * Evaluates achievements from tracker data and spots new unlocks.
 * Seen ids live in localStorage; on the very first run (per browser) everything
 * already earned is marked as seen so you don't get a flood of pop-ups.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { earnedIds, evaluateMilestones, evaluateWeeks } from '../lib/achievements.js';
import { readJSON, writeJSON } from '../lib/storage.js';

const SEEN_KEY = 'dawn-achievements-seen';
const SETTLE_MS = 1800; // wait until you pause, so a pop-up never interrupts typing

const isTyping = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

function describe(id, weeks, milestones) {
  if (id.startsWith('m:')) {
    const badge = milestones.find((m) => `m:${m.id}` === id);
    return badge && { key: id, badge };
  }
  const [weekPart, badgeId] = id.split(':');
  const week = weeks[Number(weekPart.slice(1)) - 1];
  const badge = week?.badges.find((b) => b.id === badgeId);
  return badge && { key: id, badge, week: week.label };
}

export function useAchievements({ settings, days, topics, today, ready }) {
  const weeks = useMemo(() => evaluateWeeks({ settings, days, topics, today }), [settings, days, topics, today]);
  const milestones = useMemo(
    () => evaluateMilestones({ settings, days, topics, today }),
    [settings, days, topics, today],
  );
  const earned = useMemo(() => earnedIds(weeks, milestones), [weeks, milestones]);

  const [queue, setQueue] = useState([]);
  const [settled, setSettled] = useState(true);

  // Hold celebrations while you're mid-edit; show them once you've paused.
  useEffect(() => {
    setSettled(false);
    let id;
    const check = () => {
      if (isTyping()) id = setTimeout(check, 1000);
      else setSettled(true);
    };
    id = setTimeout(check, SETTLE_MS);
    return () => clearTimeout(id);
  }, [earned]);

  useEffect(() => {
    if (!ready) return; // wait for server data, or everything would look "new"
    const seen = readJSON(SEEN_KEY, null);
    if (seen === null) {
      writeJSON(SEEN_KEY, earned);
      return;
    }
    const seenSet = new Set(seen);
    const fresh = earned.filter((id) => !seenSet.has(id));
    if (!fresh.length) return;
    writeJSON(SEEN_KEY, [...seen, ...fresh]);
    // Show the crown and milestones first: they're the biggest moments.
    fresh.sort((a, b) => Number(b.endsWith(':perfect') || b.startsWith('m:')) - Number(a.endsWith(':perfect') || a.startsWith('m:')));
    setQueue((q) => [...q, ...fresh]);
  }, [earned, ready]);

  const current = settled && queue.length ? describe(queue[0], weeks, milestones) : null;
  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  const clear = useCallback(() => setQueue([]), []);

  return {
    weeks,
    milestones,
    earnedCount: earned.length,
    totalCount: weeks.reduce((n, w) => n + w.badges.length, 0) + milestones.length,
    unlock: current,
    remaining: Math.max(0, queue.length - 1),
    nextUnlock: next,
    clearUnlocks: clear,
  };
}
