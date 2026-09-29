/**
 * Single source of truth for settings, logged days and study topics.
 * - Reads a local cache first so the app opens instantly and works offline.
 * - Every change is applied to state immediately, then queued for the API.
 *   The queue keeps only the latest change per record and retries when offline.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_ENABLED, api } from '../api/client.js';
import { STUDY_TRACKS, upgradeSettings } from '../config/goals.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { targetsToSeed, withTargetLinks } from '../lib/topics.js';

const CACHE_KEY = 'dawn-cache-v3';
const OLD_CACHE_KEY = 'dawn-cache-v2'; // read once so earlier data isn't lost
const SEEDED_KEY = 'dawn-seeded-targets';
const SAVE_DELAY_MS = 600;
const RETRY_MS = 30_000;

const CLOUD_SAVE_MS = 1200;

/** Hosted on claude.ai there is no Flask server; the page can keep a copy in your account instead. */
const CLOUD_POSSIBLE = !API_ENABLED && typeof window !== 'undefined' && Boolean(window.claude?.use);

const TrackerContext = createContext(null);

/** Queue operations, keyed so newer changes to the same record replace older ones. */
const dayOp = (dateKey, patch) => ({ key: `day:${dateKey}`, run: () => api.patchDay(dateKey, patch), patch });
const topicOp = (topic) => ({ key: `topic:${topic.id}`, run: () => api.saveTopic(topic) });
const deleteTopicOp = (id) => ({ key: `topic:${id}`, run: () => api.deleteTopic(id) });

/** Adds any configured targets not yet seeded on this device, and their course links. */
function seedLocal(list) {
  const seeded = new Set(readJSON(SEEDED_KEY, []));
  const { newTopics } = targetsToSeed(STUDY_TRACKS, new Set(list.map((t) => t.id)), seeded);
  return withTargetLinks([...list, ...newTopics], STUDY_TRACKS);
}

export function TrackerProvider({ children }) {
  const [cache] = useState(() => readJSON(CACHE_KEY, null) ?? readJSON(OLD_CACHE_KEY, null));
  const [settings, setSettings] = useState(() => upgradeSettings(cache?.settings ?? {}));
  const [days, setDays] = useState(cache?.days ?? {});
  const [topics, setTopics] = useState(() => {
    const cached = cache?.topics ?? [];
    if (API_ENABLED) return cached; // the server seeds targets itself
    return seedLocal(cached); // pure: seeded ids are saved in an effect below
  });
  // loading | online | offline (Flask) · local (this browser only) · cloud (your claude.ai account)
  const [status, setStatus] = useState(API_ENABLED || CLOUD_POSSIBLE ? 'loading' : 'local');
  const updatedAt = useRef(cache?.updatedAt ?? 0);
  const cloud = useRef(null);

  const queue = useRef(new Map());
  const timer = useRef(null);

  useEffect(
    () => writeJSON(CACHE_KEY, { settings, days, topics, updatedAt: updatedAt.current }),
    [settings, days, topics],
  );

  // claude.ai hosting: load from the account once, then save a copy after each change.
  useEffect(() => {
    if (!CLOUD_POSSIBLE) return undefined;
    let cancelled = false;
    (async () => {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const uid = db && user ? await user.id() : null;
      if (cancelled) return;
      if (!uid) return setStatus('local');
      const ref = db.doc(`data/users/${uid}/dawn`);
      const snap = await ref.get();
      const remote = snap.exists ? snap.data() : null;
      if (cancelled) return;
      if (remote && (remote.updatedAt ?? 0) > updatedAt.current) {
        updatedAt.current = remote.updatedAt;
        setSettings(upgradeSettings(remote.settings ?? {}));
        setDays(remote.days ?? {});
        setTopics(seedLocal(remote.topics ?? []));
      }
      cloud.current = { ref, timer: null };
      setStatus('cloud');
    })().catch(() => !cancelled && setStatus('local'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const c = cloud.current;
    if (!c || !updatedAt.current) return;
    clearTimeout(c.timer);
    c.timer = setTimeout(() => {
      const doc = JSON.parse(JSON.stringify({ settings, days, topics, updatedAt: updatedAt.current }));
      c.ref.set(doc).catch(() => setStatus('local'));
    }, CLOUD_SAVE_MS);
  }, [settings, days, topics, status]);

  // Local-only mode: remember which configured targets were seeded on this device.
  useEffect(() => {
    if (API_ENABLED) return;
    const seeded = new Set(readJSON(SEEDED_KEY, []));
    const { newlySeeded } = targetsToSeed(STUDY_TRACKS, new Set(), seeded);
    if (newlySeeded.length) writeJSON(SEEDED_KEY, [...seeded, ...newlySeeded]);
  }, []);

  const flush = useCallback(async () => {
    const batch = [...queue.current.values()];
    queue.current.clear();
    const results = await Promise.allSettled(batch.map((op) => op.run()));
    const failed = batch.filter((_, i) => results[i].status === 'rejected');
    // Re-queue failures unless a newer change for the same record arrived meanwhile.
    failed.forEach((op) => !queue.current.has(op.key) && queue.current.set(op.key, op));
    if (failed.length) {
      setStatus('offline');
      timer.current = setTimeout(flush, RETRY_MS);
    } else if (batch.length) {
      setStatus('online');
    }
  }, []);

  const enqueue = useCallback(
    (op) => {
      if (!API_ENABLED) return;
      const previous = queue.current.get(op.key);
      // Day patches merge; topic writes simply replace.
      const next = previous?.patch && op.patch ? dayOp(op.key.slice(4), { ...previous.patch, ...op.patch }) : op;
      queue.current.set(op.key, next);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  // Initial load from the API (skipped in local-only mode).
  useEffect(() => {
    if (!API_ENABLED) return undefined;
    let cancelled = false;
    Promise.all([api.getSettings(), api.getDays(), api.getTopics()])
      .then(([remoteSettings, remoteDays, remoteTopics]) => {
        if (cancelled) return;
        setSettings(upgradeSettings(remoteSettings));
        setDays((local) => ({ ...local, ...remoteDays }));
        setTopics(remoteTopics);
        setStatus('online');
      })
      .catch(() => !cancelled && setStatus('offline'));
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, []);

  const updateDay = useCallback(
    (dateKey, patch) => {
      updatedAt.current = Date.now(); // newest copy wins when devices sync
      setDays((prev) => ({ ...prev, [dateKey]: { ...prev[dateKey], ...patch } }));
      enqueue(dayOp(dateKey, patch));
    },
    [enqueue],
  );

  const saveTopic = useCallback(
    (topic) => {
      updatedAt.current = Date.now(); // newest copy wins when devices sync
      setTopics((prev) => {
        const exists = prev.some((t) => t.id === topic.id);
        return exists ? prev.map((t) => (t.id === topic.id ? topic : t)) : [...prev, topic];
      });
      enqueue(topicOp(topic));
    },
    [enqueue],
  );

  /** Add many topics at once (used by the target importer). */
  const addTopics = useCallback(
    (list) => {
      updatedAt.current = Date.now(); // newest copy wins when devices sync
      setTopics((prev) => [...prev, ...list]);
      list.forEach((topic) => enqueue(topicOp(topic)));
    },
    [enqueue],
  );

  const deleteTopic = useCallback(
    (id) => {
      updatedAt.current = Date.now(); // newest copy wins when devices sync
      setTopics((prev) => prev.filter((t) => t.id !== id));
      enqueue(deleteTopicOp(id));
    },
    [enqueue],
  );

  const saveSettings = useCallback(async (next) => {
    updatedAt.current = Date.now();
    setSettings(next);
    if (!API_ENABLED) return { ok: true, offline: true };
    try {
      setSettings(await api.saveSettings(next));
      setStatus('online');
      return { ok: true };
    } catch (error) {
      if (error.status === 400) return { ok: false, message: error.message };
      setStatus('offline');
      return { ok: true, offline: true };
    }
  }, []);

  const resetAll = useCallback(async () => {
    updatedAt.current = Date.now();
    setDays({});
    setTopics([]);
    queue.current.clear();
    if (!API_ENABLED) return;
    try {
      await api.deleteDays();
    } catch {
      setStatus('offline');
    }
  }, []);

  const value = useMemo(
    () => ({ settings, days, topics, status, updateDay, saveTopic, addTopics, deleteTopic, saveSettings, resetAll }),
    [settings, days, topics, status, updateDay, saveTopic, addTopics, deleteTopic, saveSettings, resetAll],
  );
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) throw new Error('useTracker must be used inside <TrackerProvider>');
  return context;
}
