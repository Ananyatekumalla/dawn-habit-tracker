/** Inline form to add your own goal to a section, with an optional reminder time. */
import { useState } from 'react';
import { makeId } from '../../lib/topics.js';

const EMPTY = { name: '', type: 'check', target: '', unit: '', time: '' };

export function AddGoalForm({ section, onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const valid = form.name.trim() && (form.type === 'check' || Number(form.target) > 0);

  if (!open) {
    return (
      <button className="add-goal-btn" onClick={() => setOpen(true)}>
        + Add a goal to {section.name}
      </button>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd({
      id: `c-${makeId().slice(0, 8)}`,
      section: section.id,
      name: form.name.trim().slice(0, 60),
      type: form.type,
      target: form.type === 'count' ? Number(form.target) : null,
      unit: form.unit.trim().slice(0, 16),
      time: form.time,
    });
    setForm(EMPTY);
    setOpen(false);
  };

  return (
    <form className="add-goal" onSubmit={submit}>
      <input autoFocus value={form.name} onChange={set('name')} placeholder="e.g. Drink 3L water, 20 push-ups, read 10 pages" aria-label="Goal name" maxLength={60} />
      <div className="add-goal-row">
        <div className="seg" role="radiogroup" aria-label="Goal type">
          {[
            ['check', 'Tick off'],
            ['count', 'Count'],
          ].map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={form.type === value} onClick={() => setForm((f) => ({ ...f, type: value }))}>
              {label}
            </button>
          ))}
        </div>
        {form.type === 'count' && (
          <>
            <input type="number" min="0.1" step="any" value={form.target} onChange={set('target')} placeholder="Target" aria-label="Target" className="small" />
            <input value={form.unit} onChange={set('unit')} placeholder="unit (glasses, pages…)" aria-label="Unit" className="small wide" maxLength={16} />
          </>
        )}
        <label className="time-opt">
          Reminder <span>(optional)</span>
          <input type="time" value={form.time} onChange={set('time')} aria-label="Reminder time (optional)" />
        </label>
      </div>
      <div className="add-goal-actions">
        <button type="submit" className="btn primary" disabled={!valid}>
          Add goal
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
