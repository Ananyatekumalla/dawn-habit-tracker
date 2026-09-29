/**
 * Study planner. Write the topics you plan to cover each day, per track,
 * and tick them off. Unfinished topics carry over until you finish or move them.
 */
import { useMemo, useState } from 'react';
import { CourseLink } from '../components/study/CourseLink.jsx';
import { ProjectsPanel } from '../components/study/ProjectsPanel.jsx';
import { TargetsPanel } from '../components/study/TargetsPanel.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { STUDY_TRACKS } from '../config/goals.js';
import { useTracker } from '../hooks/useTracker.jsx';
import { burst } from '../lib/burst.js';
import { addDays, formatDate } from '../lib/dates.js';
import { studyTarget } from '../lib/scoring.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { backlog, carriedOver, coveredOn, newTopic, toggleDone, topicsOn, trackProgress } from '../lib/topics.js';

const TRACK_BY_ID = Object.fromEntries(STUDY_TRACKS.map((t) => [t.id, t]));
const LAST_TRACK_KEY = 'dawn-last-track';
const EMPTY_DAY = {};

function TopicItem({ topic, today, showDate, onToggle, onDelete, onMoveToToday, onSave }) {
  const track = TRACK_BY_ID[topic.track];
  return (
    <li className={`topic ${topic.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        className="tick"
        checked={topic.done}
        aria-label={`Mark ${topic.title} as ${topic.done ? 'not covered' : 'covered'}`}
        onChange={(e) => onToggle(topic, e.currentTarget)}
      />
      <div className="topic-text">
        <span className="topic-title">{topic.title}</span>
        <span className="topic-meta">
          <span className="track-pill" style={{ '--c': `var(${track.color})` }}>
            {track.emoji} {track.short}
          </span>
          {showDate && <span>from {formatDate(topic.date, { day: 'numeric', month: 'short' })}</span>}
          <CourseLink topic={topic} onSave={onSave} />
        </span>
      </div>
      {onMoveToToday && topic.date < today && (
        <button className="link-btn" onClick={() => onMoveToToday(topic)}>
          Move to today
        </button>
      )}
      <button className="icon-x" aria-label={`Delete ${topic.title}`} onClick={() => onDelete(topic)}>
        ✕
      </button>
    </li>
  );
}

export function StudyPage({ today }) {
  const { settings, days, topics, saveTopic, addTopics, deleteTopic, updateDay, saveSettings } = useTracker();
  const toast = useToast();
  const [dateKey, setDateKey] = useState(today);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('plan'); // plan | targets | projects
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState(() => readJSON(LAST_TRACK_KEY, STUDY_TRACKS[0].id));

  const progress = useMemo(() => trackProgress(topics, STUDY_TRACKS), [topics]);
  const inFilter = (t) => filter === 'all' || t.track === filter;
  const planned = useMemo(() => topicsOn(topics, dateKey).filter(inFilter), [topics, dateKey, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const carried = useMemo(
    () => (dateKey === today ? carriedOver(topics, today).filter(inFilter) : []),
    [topics, dateKey, today, filter], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const coveredToday = coveredOn(topics, today).length;

  const day = days[today] ?? EMPTY_DAY;
  const hours = day.study ?? 0;
  const target = studyTarget(settings, today);

  const suggestions = useMemo(() => backlog(topics, track), [topics, track]);

  const add = () => {
    const text = title.trim();
    if (!text) return;
    // Typing (or picking) an existing target schedules it instead of duplicating it.
    const target = suggestions.find((t) => t.title.toLowerCase() === text.toLowerCase());
    saveTopic(target ? { ...target, date: dateKey } : newTopic({ title: text, track, date: dateKey }));
    writeJSON(LAST_TRACK_KEY, track);
    setTitle('');
  };

  const importTargets = (trackId, titles) => {
    const known = new Set(topics.filter((t) => t.track === trackId).map((t) => t.title.toLowerCase()));
    const fresh = titles.filter((t) => !known.has(t.toLowerCase()));
    addTopics(fresh.map((t) => newTopic({ title: t, track: trackId })));
    const skipped = titles.length - fresh.length;
    toast(`Added ${fresh.length} target${fresh.length === 1 ? '' : 's'}${skipped ? ` (${skipped} already there)` : ''}`);
  };

  const toggle = (topic, el) => {
    const next = toggleDone(topic, today);
    saveTopic(next);
    if (next.done) {
      burst(el);
      toast(`Covered: ${topic.title}`);
    }
  };

  const remove = (topic) => {
    deleteTopic(topic.id);
    toast('Topic deleted');
  };

  const moveToToday = (topic) => saveTopic({ ...topic, date: today });

  const grouped = STUDY_TRACKS.map((t) => ({ track: t, items: planned.filter((p) => p.track === t.id) })).filter(
    (g) => g.items.length,
  );

  return (
    <section className="view active study" aria-label="Study planner">
      <div className="study-head">
        <div>
          <h2 className="page-title">Study planner</h2>
          <p className="sub">Write what you&apos;ll cover today in each track, then tick it off.</p>
        </div>
        <div className="hours-card">
          <span>Hours studied today</span>
          <div className="step">
            <button aria-label="Less study time" onClick={() => updateDay(today, { study: Math.max(0, hours - 0.5) })}>
              −
            </button>
            <output>{hours}</output>
            <button aria-label="More study time" onClick={() => updateDay(today, { study: hours + 0.5 })}>
              +
            </button>
          </div>
          <small>
            Target {target}h · {coveredToday} topic{coveredToday === 1 ? '' : 's'} covered today
          </small>
        </div>
      </div>

      <div className="track-cards">
        {STUDY_TRACKS.map((t, i) => {
          const p = progress[t.id];
          return (
            <button
              key={t.id}
              className="track-card pop"
              style={{ '--i': i, '--c': `var(${t.color})` }}
              aria-pressed={filter === t.id}
              onClick={() => setFilter((f) => (f === t.id ? 'all' : t.id))}
            >
              <span className="track-emoji" aria-hidden="true">
                {t.emoji}
              </span>
              <strong>{t.name}</strong>
              <span className="track-count">
                {p.total ? `${p.done}/${p.total} done · ${p.pct}%` : 'No targets yet'}
              </span>
              <div className="mini-meter">
                <i style={{ width: `${p.pct}%`, background: `var(${t.color})` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="view-switch" role="tablist" aria-label="Study view">
        <button role="tab" aria-selected={view === 'plan'} onClick={() => setView('plan')}>
          Daily plan
        </button>
        <button role="tab" aria-selected={view === 'targets'} onClick={() => setView('targets')}>
          Targets
        </button>
        <button role="tab" aria-selected={view === 'projects'} onClick={() => setView('projects')}>
          Projects
        </button>
      </div>

      {view === 'projects' && (
        <ProjectsPanel
          settings={settings}
          days={days}
          onPick={async (p) => {
            await saveSettings({ ...settings, currentProject: p.id });
            toast(`Night project: ${p.title}`);
          }}
        />
      )}

      {view === 'targets' && (
        <TargetsPanel
          topics={topics}
          filter={filter}
          today={today}
          onSchedule={(t) => {
            saveTopic({ ...t, date: today });
            toast(`Added to today: ${t.title}`);
          }}
          onToggle={toggle}
          onDelete={remove}
          onImport={importTargets}
          onSave={saveTopic}
        />
      )}

      {view === 'plan' && (
      <div className="panel">
        <div className="day-nav">
          <button className="btn" aria-label="Previous day" onClick={() => setDateKey((d) => addDays(d, -1))}>
            ‹
          </button>
          <input type="date" className="datepick" value={dateKey} aria-label="Plan date" onChange={(e) => e.target.value && setDateKey(e.target.value)} />
          <button className="btn" aria-label="Next day" onClick={() => setDateKey((d) => addDays(d, 1))}>
            ›
          </button>
          <h3>{dateKey === today ? 'Today' : formatDate(dateKey, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
          {dateKey !== today && (
            <button className="link-btn" onClick={() => setDateKey(today)}>
              Back to today
            </button>
          )}
          {filter !== 'all' && (
            <button className="link-btn" onClick={() => setFilter('all')}>
              Show all tracks
            </button>
          )}
        </div>

        <form
          className="add-topic"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <div className="track-picker" role="radiogroup" aria-label="Track">
            {STUDY_TRACKS.map((t) => (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={track === t.id}
                style={{ '--c': `var(${t.color})` }}
                onClick={() => setTrack(t.id)}
              >
                {t.emoji} {t.short}
              </button>
            ))}
          </div>
          <div className="addrow">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`What will you study in ${TRACK_BY_ID[track].name}?`}
              aria-label="Topic"
              maxLength={200}
              list="target-suggestions"
            />
            <datalist id="target-suggestions">
              {suggestions.map((t) => (
                <option key={t.id} value={t.title} />
              ))}
            </datalist>
            <button type="submit">Add topic</button>
          </div>
        </form>

        {grouped.length === 0 && (
          <p className="empty">
            No topics for {dateKey === today ? 'today' : 'this day'} yet. Add what you plan to cover above.
          </p>
        )}
        {grouped.map(({ track: t, items }) => (
          <div key={t.id} className="topic-group">
            <h4>
              <span className="dot" style={{ background: `var(${t.color})` }} />
              {t.name}
              <span className="count">
                {items.filter((x) => x.done).length}/{items.length}
              </span>
            </h4>
            <ul className="topic-list">
              {items.map((topic) => (
                <TopicItem key={topic.id} topic={topic} today={today} onToggle={toggle} onDelete={remove} onSave={saveTopic} />
              ))}
            </ul>
          </div>
        ))}
        {suggestions.length > 0 && (
          <p className="sub" style={{ marginTop: 14 }}>
            {suggestions.length} {TRACK_BY_ID[track].short} target{suggestions.length === 1 ? '' : 's'} not scheduled yet. Start
            typing to pick one, or open <button className="link-btn" onClick={() => setView('targets')}>Targets</button>.
          </p>
        )}
      </div>
      )}

      {view === 'plan' && carried.length > 0 && (
        <div className="panel carried">
          <h2>Carried over</h2>
          <p className="sub">Unfinished topics from earlier days. Tick them off or move them to today.</p>
          <ul className="topic-list">
            {carried.map((topic) => (
              <TopicItem
                key={topic.id}
                topic={topic}
                today={today}
                showDate
                onToggle={toggle}
                onDelete={remove}
                onMoveToToday={moveToToday}
                onSave={saveTopic}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
