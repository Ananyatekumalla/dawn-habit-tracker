/**
 * A winding road from the first to the last day. Each dot is a day coloured by
 * its score; Sunny sits on today. The road draws itself once on load.
 */
import { memo, useMemo } from 'react';
import { formatDate } from '../../lib/dates.js';
import { scoreLevel } from '../../lib/scoring.js';

const W = 1000;
const H = 150;
const PAD = 34;
const AMPLITUDE = 36;
const WAVES = 2.5;
const LEVEL_FILL = ['var(--surface)', 'color-mix(in srgb,var(--sky) 35%,var(--line))', 'color-mix(in srgb,var(--sky) 70%,var(--line))', 'var(--sky)', 'var(--sun)'];

const pointAt = (t) => ({
  x: PAD + t * (W - PAD * 2),
  y: H / 2 + AMPLITUDE * Math.sin(t * Math.PI * 2 * WAVES),
});

export const JourneyPath = memo(function JourneyPath({ scores, start, end, todayIndex }) {
  const d = useMemo(() => {
    const steps = 160;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const { x, y } = pointAt(i / steps);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, []);

  const total = scores.length;
  const here = pointAt(total > 1 ? Math.max(0, todayIndex) / (total - 1) : 0);

  return (
    <div className="journey">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Day ${todayIndex + 1} of ${total} on your journey`}>
        <path d={d} className="journey-road" pathLength="1" />
        <path
          d={d}
          className="journey-done"
          pathLength="1"
          style={{ '--done': total > 1 ? Math.max(0, todayIndex) / (total - 1) : 0 }}
        />
        {scores.map((s, i) => {
          const p = pointAt(total > 1 ? i / (total - 1) : 0);
          const future = i > todayIndex;
          return (
            <circle
              key={s.date}
              cx={p.x}
              cy={p.y}
              r={future ? 3.2 : 5}
              className={`journey-dot ${future ? 'future' : ''}`}
              style={{ fill: future ? 'var(--surface)' : LEVEL_FILL[scoreLevel(s.score)], '--i': Math.min(i, 40) }}
            >
              <title>{`${formatDate(s.date, { day: 'numeric', month: 'short' })}${s.score !== null ? `: ${s.score}` : ''}`}</title>
            </circle>
          );
        })}
        <g className="journey-flag" transform={`translate(${W - PAD} ${pointAt(1).y})`}>
          <line x1="0" y1="0" x2="0" y2="-30" stroke="var(--ink)" strokeWidth="2" />
          <path d="M0 -30 L20 -24 L0 -18 Z" fill="var(--rose)" />
        </g>
        <g transform={`translate(${here.x.toFixed(1)} ${here.y.toFixed(1)})`}>
          <g className="journey-me">
          <circle r="11" fill="var(--sun)" />
          <circle r="16" fill="none" stroke="var(--sun)" strokeWidth="2" className="journey-pulse" />
          <circle cx="-3.5" cy="-2" r="1.6" fill="#7A3E12" />
          <circle cx="3.5" cy="-2" r="1.6" fill="#7A3E12" />
          <path d="M-3.5 3 q3.5 3 7 0" stroke="#7A3E12" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>
      <div className="journey-labels">
        <span>{formatDate(start, { day: 'numeric', month: 'short' })}</span>
        <span>{formatDate(end, { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
});
