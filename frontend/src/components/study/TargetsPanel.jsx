/**
 * Everything each track needs by the end of the challenge. Paste a list to add
 * many targets at once, then pull them into a day's plan with "Add to today".
 */
import { useMemo, useState } from 'react';
import { STUDY_TRACKS } from '../../config/goals.js';
import { formatDate } from '../../lib/dates.js';
import { parseTargetList } from '../../lib/topics.js';
import { CourseLink } from './CourseLink.jsx';

const SHORT = { day: 'numeric', month: 'short' };

function ImportBox({ defaultTrack, onImport }) {
  const [track, setTrack] = useState(defaultTrack);
  const [text, setText] = useState('');
  const titles = useMemo(() => parseTargetList(text), [text]);
  const trackName = STUDY_TRACKS.find((t) => t.id === track).name;

  return (
    <details className="import-box">
      <summary>Add targets in bulk</summary>
      <div className="track-picker" role="radiogroup" aria-label="Track for these targets">
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
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Paste one target per line, for example:\n1. Excel pivot tables\n2. SQL joins\n3. Power BI dashboards'}
        aria-label={`Targets for ${trackName}`}
      />
      <button
        className="btn primary"
        disabled={!titles.length}
        onClick={() => {
          onImport(track, titles);
          setText('');
        }}
      >
        {titles.length ? `Add ${titles.length} target${titles.length === 1 ? '' : 's'} to ${trackName}` : 'Paste targets above'}
      </button>
    </details>
  );
}

function TargetRow({ topic, today, onSchedule, onToggle, onDelete, onSave }) {
  const scheduledLabel = topic.date === today ? 'Today' : topic.date ? `Planned ${formatDate(topic.date, SHORT)}` : null;
  return (
    <li className={`topic target ${topic.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        className="tick"
        checked={topic.done}
        aria-label={`Mark ${topic.title} as ${topic.done ? 'not done' : 'done'}`}
        onChange={(e) => onToggle(topic, e.currentTarget)}
      />
      <div className="topic-text">
        <span className="topic-title">{topic.title}</span>
        <span className="topic-meta">
          {(scheduledLabel || topic.doneDate) && (
            <span>{topic.done ? `Done ${formatDate(topic.doneDate ?? topic.date, SHORT)}` : scheduledLabel}</span>
          )}
          <CourseLink topic={topic} onSave={onSave} />
        </span>
      </div>
      {!topic.done && topic.date !== today && (
        <button className="link-btn" onClick={() => onSchedule(topic)}>
          Add to today
        </button>
      )}
      <button className="icon-x" aria-label={`Delete ${topic.title}`} onClick={() => onDelete(topic)}>
        ✕
      </button>
    </li>
  );
}

export function TargetsPanel({ topics, filter, today, onSchedule, onToggle, onDelete, onImport, onSave }) {
  const tracks = STUDY_TRACKS.filter((t) => filter === 'all' || t.id === filter);
  const hasAny = topics.length > 0;

  return (
    <div className="panel">
      <h2>Targets to finish by the end</h2>
      <p className="sub">
        Everything each track needs. Unscheduled targets wait here until you add them to a day.
      </p>
      <ImportBox defaultTrack={filter === 'all' ? STUDY_TRACKS[0].id : filter} onImport={onImport} />

      {!hasAny && <p className="empty">No targets yet. Paste your list above to get started.</p>}

      {tracks.map((track) => {
        const mine = topics.filter((t) => t.track === track.id);
        if (!mine.length) return null;
        const todo = mine
          .filter((t) => !t.done)
          .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
        const done = mine.filter((t) => t.done);
        const pct = Math.round((done.length / mine.length) * 100);
        return (
          <div key={track.id} className="target-track">
            <div className="target-head">
              <span className="track-emoji small" style={{ '--c': `var(${track.color})` }} aria-hidden="true">
                {track.emoji}
              </span>
              <h3>{track.name}</h3>
              <b>
                {done.length}/{mine.length} · {pct}%
              </b>
            </div>
            <div className="mini-meter">
              <i style={{ width: `${pct}%`, background: `var(${track.color})` }} />
            </div>
            {track.courses?.length > 0 && (
              <div className="courses" aria-label={`${track.name} courses`}>
                {track.courses.map((c) => (
                  <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer" className="course-chip" style={{ '--c': `var(${track.color})` }}>
                    📺 {c.name}
                  </a>
                ))}
              </div>
            )}
            <ul className="topic-list" style={{ marginTop: 10 }}>
              {todo.map((t) => (
                <TargetRow key={t.id} topic={t} today={today} onSchedule={onSchedule} onToggle={onToggle} onDelete={onDelete} onSave={onSave} />
              ))}
            </ul>
            {done.length > 0 && (
              <details className="done-list">
                <summary>Completed ({done.length})</summary>
                <ul className="topic-list">
                  {done.map((t) => (
                    <TargetRow key={t.id} topic={t} today={today} onSchedule={onSchedule} onToggle={onToggle} onDelete={onDelete} onSave={onSave} />
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
