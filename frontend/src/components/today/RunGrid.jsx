import { memo, useMemo } from 'react';
import { ITEMS, sectionsFor } from '../../config/goals.js';
import { allDates, formatDate } from '../../lib/dates.js';
import { dayScore, isLogged, scoreLevel } from '../../lib/scoring.js';

const LEGEND = [
  ['var(--line)', 'Not logged'],
  ['color-mix(in srgb,var(--sky) 30%,var(--line))', 'Under 40'],
  ['color-mix(in srgb,var(--sky) 65%,var(--line))', '40–69'],
  ['var(--sky)', '70–89'],
  ['var(--sun)', '90+'],
];

export const RunGrid = memo(function RunGrid({ settings, days, today, onOpenDay }) {
  const cells = useMemo(
    () =>
      allDates(settings).map((dateKey, i) => {
        const day = days[dateKey];
        const score = isLogged(ITEMS, day) ? dayScore(sectionsFor(settings), day, settings, dateKey) : null;
        return { dateKey, index: i, score, level: scoreLevel(score) };
      }),
    [settings, days],
  );

  return (
    <div className="panel" style={{ marginTop: 28 }}>
      <h2>The whole run</h2>
      <p className="sub">Every square is a day. Tap one to open its journal.</p>
      <div className="field">
        {cells.map(({ dateKey, index, score, level }) => (
          <button
            key={dateKey}
            className={`cell ${level ? `l${level}` : ''} ${dateKey === today ? 'today' : ''} ${dateKey > today ? 'future' : ''}`}
            title={`${formatDate(dateKey, { day: 'numeric', month: 'short' })}${score !== null ? ` · ${score}` : ''}`}
            aria-label={`Day ${index + 1}, ${formatDate(dateKey, { day: 'numeric', month: 'long' })}, ${score !== null ? `score ${score}` : 'not logged'}`}
            onClick={() => onOpenDay(dateKey)}
          />
        ))}
      </div>
      <div className="legend">
        {LEGEND.map(([color, label]) => (
          <span key={label}>
            <i style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
});
