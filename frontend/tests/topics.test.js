import { describe, expect, it } from 'vitest';
import {
  backlog, carriedOver, coveredOn, parseTargetList, slugify, targetId, targetsToSeed, toggleDone, topicsOn, trackProgress,
} from '../src/lib/topics.js';

const TRACKS = [{ id: 'data' }, { id: 'mern' }, { id: 'ai' }];
const topics = [
  { id: '1', track: 'data', date: '2026-09-28', done: true, doneDate: '2026-09-28' },
  { id: '2', track: 'data', date: '2026-09-28', done: false, doneDate: null },
  { id: '3', track: 'ai', date: '2026-09-29', done: false, doneDate: null },
];

describe('topics', () => {
  it('finds topics planned for a date', () => {
    expect(topicsOn(topics, '2026-09-28').length).toBe(2);
  });
  it('carries over unfinished earlier topics only', () => {
    const carried = carriedOver(topics, '2026-09-29');
    expect(carried.length).toBe(1);
    expect(carried[0].id).toBe('2');
  });
  it('counts progress per track', () => {
    const progress = trackProgress(topics, TRACKS);
    expect(progress.data.pct).toBe(50);
    expect(progress.mern.total).toBe(0);
    expect(progress.ai.done).toBe(0);
  });
  it('records the day a topic was finished', () => {
    const done = toggleDone(topics[1], '2026-09-30');
    expect(done.doneDate).toBe('2026-09-30');
    expect(coveredOn([done], '2026-09-30').length).toBe(1);
    expect(toggleDone(done, '2026-09-30').doneDate).toBe(null);
  });
});

describe('targets', () => {
  it('slugs match the Python backend', () => {
    // Same cases as backend/tests/test_targets.py
    expect(slugify('SQL: Window Functions!')).toBe('sql-window-functions');
    expect(slugify('  React / Redux  ')).toBe('react-redux');
    expect(slugify('!!!')).toBe('item');
    expect(targetId('ai', 'RAG basics')).toBe('tg-ai-rag-basics');
  });

  it('parses a pasted list', () => {
    const text = '1. Excel basics\n- SQL joins\n\n• SQL joins\n[ ] Power BI\n2) Pandas';
    expect(parseTargetList(text)).toEqual(['Excel basics', 'SQL joins', 'Power BI', 'Pandas']);
  });

  it('seeds only targets never seeded before', () => {
    const tracks = [{ id: 'data', targets: ['Excel', 'SQL'] }];
    const first = targetsToSeed(tracks, new Set(), new Set());
    expect(first.newTopics.length).toBe(2);
    const again = targetsToSeed(tracks, new Set(), new Set(first.newlySeeded));
    expect(again.newTopics.length).toBe(0);
  });

  it('keeps unscheduled targets out of carry-over', () => {
    const list = [{ id: 'x', track: 'data', date: null, done: false }];
    expect(carriedOver(list, '2026-10-01').length).toBe(0);
    expect(backlog(list, 'data').length).toBe(1);
  });
});
