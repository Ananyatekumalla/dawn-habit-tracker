/**
 * "Sunny", the little sun that reacts to how today is going.
 * mood: 'sleepy' (score < 40), 'happy' (40–89), 'star' (90+). Tap it for a hop.
 */
import { useState } from 'react';
import { burst } from '../../lib/burst.js';

const RAYS = Array.from({ length: 10 }, (_, i) => i * 36);

function Eyes({ mood }) {
  if (mood === 'star') {
    const star = 'M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z';
    return (
      <g fill="#7A3E12">
        <path d={star} transform="translate(49 56)" />
        <path d={star} transform="translate(71 56)" />
      </g>
    );
  }
  if (mood === 'sleepy') {
    return (
      <g stroke="#7A3E12" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M44 57 q5 4 10 0" />
        <path d="M66 57 q5 4 10 0" />
      </g>
    );
  }
  return (
    <g className="mascot-eyes" fill="#7A3E12">
      <ellipse cx="49" cy="56" rx="3.6" ry="4.6" />
      <ellipse cx="71" cy="56" rx="3.6" ry="4.6" />
      <circle cx="50.2" cy="54.4" r="1.2" fill="#fff" />
      <circle cx="72.2" cy="54.4" r="1.2" fill="#fff" />
    </g>
  );
}

export function Mascot({ mood = 'happy', size = 132 }) {
  const [hop, setHop] = useState(0);
  const mouth = mood === 'sleepy' ? 'M56 70 q4 3 8 0' : mood === 'star' ? 'M50 66 q10 12 20 0 z' : 'M52 67 q8 8 16 0';

  return (
    <button
      type="button"
      className={`mascot mood-${mood}`}
      style={{ width: size, height: size }}
      aria-label="Sunny the mascot. Tap to say hi"
      onClick={(e) => {
        setHop((h) => h + 1);
        burst(e.currentTarget);
      }}
    >
      <svg viewBox="0 0 120 120" key={hop} className="mascot-body">
        <defs>
          <radialGradient id="sunny" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFE9A8" />
            <stop offset="60%" stopColor="#F6C453" />
            <stop offset="100%" stopColor="#F0A63A" />
          </radialGradient>
        </defs>
        <g className="mascot-rays">
          {RAYS.map((deg) => (
            <rect key={deg} x="57" y="4" width="6" height="16" rx="3" fill="#F6C453" transform={`rotate(${deg} 60 60)`} />
          ))}
        </g>
        <circle cx="60" cy="60" r="34" fill="url(#sunny)" />
        <ellipse cx="42" cy="66" rx="5.5" ry="3.5" fill="#F58FA0" opacity=".55" />
        <ellipse cx="78" cy="66" rx="5.5" ry="3.5" fill="#F58FA0" opacity=".55" />
        <Eyes mood={mood} />
        <path
          d={mouth}
          stroke="#7A3E12"
          strokeWidth="3"
          strokeLinecap="round"
          fill={mood === 'star' ? '#B4532A' : 'none'}
        />
        {mood === 'sleepy' && (
          <text x="86" y="34" className="mascot-z" fontSize="14" fontWeight="700" fill="var(--sky)">
            z
          </text>
        )}
      </svg>
    </button>
  );
}
