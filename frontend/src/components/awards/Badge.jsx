/**
 * A medal. Earned medals are in colour with a shine sweep; locked ones are grey
 * with a ring that fills as you get closer.
 */
import { memo, useId } from 'react';

const R = 40;
const CIRC = 2 * Math.PI * R;

export const Badge = memo(function Badge({ badge, size = 72, status, showProgress = true }) {
  const id = useId().replace(/:/g, '');
  const state = status ?? (badge.earned ? 'earned' : 'progress');
  const color = `var(${badge.color})`;
  return (
    <span className={`badge badge-${state}`} style={{ width: size, '--c': color }} title={`${badge.name}: ${badge.rule}`}>
      <svg viewBox="0 0 100 112" aria-hidden="true">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${id}`}>
            <circle cx="50" cy="48" r={R} />
          </clipPath>
        </defs>
        <path d="M32 78 L24 108 L38 100 L46 110 L50 84 Z" className="ribbon" />
        <path d="M68 78 L76 108 L62 100 L54 110 L50 84 Z" className="ribbon" />
        <circle cx="50" cy="48" r={R} className="medal" />
        <circle cx="50" cy="48" r={R} fill={`url(#g${id})`} className="medal-gloss" />
        <circle cx="50" cy="48" r="31" className="medal-inner" />
        {state !== 'earned' && showProgress && badge.progress > 0 && (
          <circle
            cx="50"
            cy="48"
            r={R}
            className="medal-progress"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - badge.progress)}
            transform="rotate(-90 50 48)"
          />
        )}
        <text x="50" y="58" textAnchor="middle" fontSize="28">
          {badge.emoji}
        </text>
        {state === 'earned' && (
          <g clipPath={`url(#c${id})`}>
            <rect className="medal-shine" x="-40" y="-10" width="22" height="130" transform="rotate(25 50 48)" />
          </g>
        )}
      </svg>
    </span>
  );
});
