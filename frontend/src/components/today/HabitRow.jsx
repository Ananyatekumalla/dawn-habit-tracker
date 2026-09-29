/**
 * One habit. The `type` from goals.json picks the control:
 * check → tick box, count → − / + stepper, number → text input, slots → time buttons.
 */
import { memo, useRef } from 'react';
import { HINTS } from '../../config/goals.js';
import { burst } from '../../lib/burst.js';
import { fastingHours, formatTime } from '../../lib/dates.js';
import { isItemDone, itemTarget } from '../../lib/scoring.js';

/** Helper text under a habit. Custom goals show their target and reminder time. */
function hintFor(item, settings, dateKey) {
  if (!item.custom) return HINTS[item.id]?.(settings, dateKey);
  const parts = [];
  if (item.type === 'count') parts.push(`Target ${item.target}${item.unit ? ` ${item.unit}` : ''}`);
  if (item.time) parts.push(`⏰ ${formatTime(item.time)}`);
  return parts.join(' · ') || 'Your own goal';
}

function Meter({ value, target, color }) {
  const width = `${Math.min(100, (value / target) * 100)}%`;
  return (
    <div className="meter">
      <i style={{ width, background: color }} />
    </div>
  );
}

function CheckControl({ item, day, settings, onChange }) {
  const boxRef = useRef(null);
  const set = (patch) => {
    onChange(patch);
    if (patch[item.id] && !day[item.id]) burst(boxRef.current);
  };

  const onTime = (field) => (e) => {
    const value = e.target.value;
    const patch = { [field]: value };
    const next = { ...day, ...patch };
    if (item.id === 'wake' && value && value <= settings.wake) patch.wake = true;
    if (item.id === 'fast' && fastingHours(next.fastStart, next.fastEnd) >= settings.fast) {
      patch.fast = true;
    }
    set(patch);
  };

  return (
    <>
      <div className="txt">
        <strong>
          {item.name}
          {item.custom && <span className="custom-tag">your goal</span>}
        </strong>
        <span>{hintFor(item, settings)}</span>
        {item.id === 'wake' && (
          <div className="mini" style={{ marginTop: 6 }}>
            <label style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              Woke at <input type="time" value={day.wakeTime ?? ''} onChange={onTime('wakeTime')} />
            </label>
          </div>
        )}
        {item.id === 'fast' && (
          <div className="mini" style={{ marginTop: 6 }}>
            <input
              type="time"
              aria-label="Last meal"
              value={day.fastStart ?? '20:00'}
              onChange={onTime('fastStart')}
            />
            <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>to</span>
            <input
              type="time"
              aria-label="First meal"
              value={day.fastEnd ?? '12:00'}
              onChange={onTime('fastEnd')}
            />
            <span style={{ fontSize: '.82rem', fontWeight: 700 }}>
              {fastingHours(day.fastStart ?? '20:00', day.fastEnd ?? '12:00').toFixed(1)}h
            </span>
          </div>
        )}
      </div>
      <input
        ref={boxRef}
        type="checkbox"
        className="tick"
        aria-label={item.name}
        checked={Boolean(day[item.id])}
        onChange={(e) => set({ [item.id]: e.target.checked })}
      />
    </>
  );
}

function CountControl({ item, day, settings, dateKey, onChange }) {
  const plusRef = useRef(null);
  const value = day[item.id] ?? 0;
  const target = itemTarget(item, settings, dateKey);
  const change = (delta) => {
    const next = Math.max(0, Math.round((value + delta) * 10) / 10);
    // Project hours remember which project they were spent on.
    onChange(item.id === 'project' ? { project: next, projectId: settings.currentProject } : { [item.id]: next });
    if (next >= target && value < target) burst(plusRef.current);
  };
  return (
    <>
      <div className="txt">
        <strong>
          {item.name}
          {item.custom && <span className="custom-tag">your goal</span>}
        </strong>
        <span>{hintFor(item, settings, dateKey)}</span>
        <Meter value={value} target={target} />
      </div>
      <div className="step">
        <button onClick={() => change(-item.step)} aria-label={`Less ${item.name}`}>
          −
        </button>
        <output>{value}</output>
        <button ref={plusRef} onClick={() => change(item.step)} aria-label={`More ${item.name}`}>
          +
        </button>
      </div>
    </>
  );
}

function NumberControl({ item, day, settings, dateKey, onChange }) {
  const value = day[item.id] ?? 0;
  const target = itemTarget(item, settings, dateKey);
  return (
    <>
      <div className="txt">
        <strong>
          {item.name}
          {item.custom && <span className="custom-tag">your goal</span>}
        </strong>
        <span>{hintFor(item, settings, dateKey)}</span>
        <Meter value={value} target={target} color="var(--leaf)" />
      </div>
      <input
        type="number"
        inputMode="numeric"
        className="stepsin"
        min="0"
        step="100"
        aria-label={`${item.name} today`}
        placeholder="0"
        value={value || ''}
        onChange={(e) => onChange({ [item.id]: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
      />
    </>
  );
}

function SlotsControl({ item, day, settings, onChange }) {
  const slots = day[item.id] ?? [];
  const toggle = (i, el) => {
    const next = Array.from({ length: item.slots }, (_, j) => (j === i ? !slots[j] : Boolean(slots[j])));
    onChange({ [item.id]: next });
    if (next[i]) burst(el);
  };
  return (
    <div className="txt">
      <strong>{item.name}</strong>
      <span>{hintFor(item, settings)}</span>
      <div className="slots" style={{ marginTop: 8 }}>
        {settings.naukri.map((time, i) => (
          <button
            key={time + i}
            className="slot"
            aria-pressed={Boolean(slots[i])}
            onClick={(e) => toggle(i, e.currentTarget)}
          >
            {slots[i] ? '✓ ' : ''}
            {formatTime(time)}
          </button>
        ))}
      </div>
    </div>
  );
}

const CONTROLS = { check: CheckControl, count: CountControl, number: NumberControl, slots: SlotsControl };

export const HabitRow = memo(function HabitRow({ item, day, settings, dateKey, onChange, onRemove }) {
  const Control = CONTROLS[item.type];
  const done = isItemDone(item, day, settings, dateKey);
  return (
    <div className={`habit ${done ? 'done' : ''}`}>
      <Control item={item} day={day} settings={settings} dateKey={dateKey} onChange={onChange} />
      {onRemove && (
        <button className="icon-x" aria-label={`Remove goal ${item.name}`} onClick={() => onRemove(item)}>
          ✕
        </button>
      )}
    </div>
  );
});
