import { moodFor } from '../../config/goals.js';
import { useCountUp } from '../../hooks/useCountUp.js';

const CIRCUMFERENCE = 2 * Math.PI * 40;
const RING_COLORS = ['var(--muted)', 'var(--muted)', 'var(--rose)', 'var(--sky)', 'var(--sun)'];
const MESSAGES = [
  [100, 'Perfect day', "Every goal hit. That's the standard."],
  [90, 'Nearly flawless', "One more push and it's a perfect day."],
  [70, 'Strong day', "You're keeping the promise to yourself."],
  [40, 'Halfway there', 'Pick the next easiest goal and do it now.'],
  [1, 'Warming up', 'Every tick counts. Keep going.'],
  [0, "Let's begin", 'Tick things off as you go. Your score updates live.'],
];

export function ScoreRing({ score, level }) {
  const shown = useCountUp(score);
  const [, title, sub] = MESSAGES.find(([min]) => score >= min);
  const mood = moodFor(score);
  return (
    <div className="scorehead">
      <div className="ring" role="img" aria-label={`Score ${score} out of 100`}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle className="track" cx="48" cy="48" r="40" fill="none" strokeWidth="9" />
          <circle
            className="bar"
            cx="48"
            cy="48"
            r="40"
            fill="none"
            strokeWidth="9"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
            style={{ stroke: RING_COLORS[level] }}
          />
        </svg>
        <div className="val" aria-hidden="true">
          {shown}
        </div>
      </div>
      <div className="mood" title={mood.label} aria-label={`Mood: ${mood.label}`} role="img">
        <span key={mood.emoji}>{mood.emoji}</span>
      </div>
      <div>
        <h2>{title}</h2>
        <p className="sub" style={{ margin: 0 }}>
          {sub}
        </p>
      </div>
    </div>
  );
}
