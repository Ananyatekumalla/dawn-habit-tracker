import { useEffect, useMemo, useState } from 'react';
import { useTracker } from '../hooks/useTracker.jsx';
import { formatDate } from '../lib/dates.js';

const MOODS = ['😣', '😕', '😐', '🙂', '😄'];
const TEXT_SAVE_DELAY_MS = 500;
const EMPTY_DAY = {};

function ItemList({ title, className, placeholder, items, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft('');
  };
  return (
    <div className={className}>
      <h3>{title}</h3>
      <div className="addrow">
        <input
          value={draft}
          placeholder={placeholder}
          aria-label={title}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add}>Add</button>
      </div>
      <ul className="items">
        {items.map((text, i) => (
          <li key={`${i}-${text}`}>
            <span>{text}</span>
            <button aria-label={`Remove ${text}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JournalPage({ dateKey, onDateChange }) {
  const { days, updateDay } = useTracker();
  const day = days[dateKey] ?? EMPTY_DAY;

  // Text is kept locally while typing and saved after a pause.
  const [text, setText] = useState(day.journal ?? '');
  const [saved, setSaved] = useState('');
  useEffect(() => {
    setText(days[dateKey]?.journal ?? '');
    setSaved('');
  }, [dateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (text === (day.journal ?? '')) return undefined;
    setSaved('Saving…');
    const id = setTimeout(() => {
      updateDay(dateKey, { journal: text });
      setSaved('Saved');
    }, TEXT_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const entries = useMemo(
    () =>
      Object.entries(days)
        .filter(([, d]) => d.journal || d.dos?.length || d.donts?.length || d.mood)
        .sort(([a], [b]) => b.localeCompare(a)),
    [days],
  );

  return (
    <section className="view active" aria-label="Journal">
      <div className="journal">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2>{formatDate(dateKey, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
            <input
              type="date"
              className="datepick"
              aria-label="Journal date"
              value={dateKey}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
            />
          </div>
          <p className="sub" style={{ marginTop: 6 }}>
            How did today go? Write it down while it&apos;s fresh.
          </p>
          <div style={{ fontWeight: 600, fontSize: '.9rem' }}>Mood</div>
          <div className="moods">
            {MOODS.map((emoji, i) => (
              <button
                key={emoji}
                aria-label={`Mood ${i + 1} of 5`}
                aria-pressed={day.mood === i + 1}
                onClick={() => updateDay(dateKey, { mood: i + 1 })}
              >
                {emoji}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What went well, what got in the way, what you learned…"
            aria-label="Journal entry"
          />
          <div className="saved">{saved}</div>
          <div className="lists">
            <ItemList
              title="Do's"
              className="do"
              placeholder="Keep doing…"
              items={day.dos ?? []}
              onChange={(dos) => updateDay(dateKey, { dos })}
            />
            <ItemList
              title="Don'ts"
              className="dont"
              placeholder="Stop doing…"
              items={day.donts ?? []}
              onChange={(donts) => updateDay(dateKey, { donts })}
            />
          </div>
        </div>

        <div className="panel">
          <h2>Past entries</h2>
          <p className="sub">Newest first</p>
          <ul className="entries">
            {entries.length === 0 && <li className="sub">Your entries will show up here.</li>}
            {entries.map(([key, d]) => (
              <li key={key}>
                <button aria-current={key === dateKey} onClick={() => onDateChange(key)}>
                  <strong>
                    {d.mood ? `${MOODS[d.mood - 1]} ` : ''}
                    {formatDate(key, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </strong>
                  <small>{d.journal || `${d.dos?.length ?? 0} do's, ${d.donts?.length ?? 0} don'ts`}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
