/** Full-screen "Achievement unlocked!" moment with falling confetti. */
import { useEffect, useRef } from 'react';
import { Badge } from './Badge.jsx';

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 12) * 0.12,
  duration: 2.2 + (i % 5) * 0.35,
  color: ['var(--sun)', 'var(--sky)', 'var(--rose)', 'var(--leaf)'][i % 4],
  rotate: (i * 47) % 360,
}));

export function UnlockCelebration({ unlock, remaining, onNext, onSeeAll }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!unlock) return undefined;
    buttonRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onNext();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlock, onNext]);

  if (!unlock) return null;
  return (
    <div className="unlock-overlay" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="confetti" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <i
            key={i}
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.duration}s`,
              '--r': `${c.rotate}deg`,
            }}
          />
        ))}
      </div>
      <div className="unlock-card" key={unlock.key}>
        <div className="unlock-rays" aria-hidden="true" />
        <div className="unlock-badge">
          <Badge badge={{ ...unlock.badge, earned: true }} size={140} />
        </div>
        <p className="unlock-kicker">Achievement unlocked!</p>
        <h2 id="unlock-title">{unlock.badge.name}</h2>
        <p className="unlock-rule">
          {unlock.badge.rule}
          {unlock.week ? ` · ${unlock.week}` : ''}
        </p>
        {unlock.badge.id === 'treat' && <p className="unlock-treat">Pick your treat in Awards: café, dinner, ice cream… 🍦</p>}
        <div className="unlock-actions">
          <button ref={buttonRef} className="btn primary" onClick={onNext}>
            {remaining > 0 ? `Next (${remaining} more)` : 'Yay!'}
          </button>
          {remaining > 0 && (
            <button className="btn" onClick={onSeeAll}>
              See all in Awards
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
