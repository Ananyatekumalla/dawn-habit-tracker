/** Achievements: this week's badges, a shelf of every week, and milestones. */
import { useState } from 'react';
import { Badge } from '../components/awards/Badge.jsx';
import { TreatCard } from '../components/home/TreatCard.jsx';
import { useTracker } from '../hooks/useTracker.jsx';
import { useTreats } from '../hooks/useTreats.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { formatDate } from '../lib/dates.js';

const SHORT = { day: 'numeric', month: 'short' };
const STATUS_TEXT = { earned: 'Earned', progress: 'In progress', missed: 'Missed', upcoming: 'Coming up' };

function BadgeTile({ badge, index }) {
  return (
    <div className={`badge-tile ${badge.status}`} style={{ '--i': index }}>
      <Badge badge={badge} status={badge.status} size={76} />
      <strong>{badge.name}</strong>
      <span className="badge-rule">{badge.rule}</span>
      <span className={`badge-state ${badge.status}`}>
        {badge.status === 'earned' ? '✓ Earned' : `${STATUS_TEXT[badge.status]} · ${badge.detail}`}
      </span>
    </div>
  );
}

function WeekRow({ week, open, onToggle }) {
  const crown = week.badges.find((b) => b.id === 'perfect');
  return (
    <li className={`week-row ${week.current ? 'current' : ''} ${crown.earned ? 'crowned' : ''}`}>
      <button className="week-head" aria-expanded={open} onClick={onToggle}>
        <span className="week-name">
          {crown.earned && <span aria-label="Perfect week">👑 </span>}
          {week.label}
          {week.current && <span className="now-pill">This week</span>}
        </span>
        <span className="week-dates">
          {formatDate(week.first, SHORT)} – {formatDate(week.last, SHORT)}
        </span>
        <span className="week-minis" aria-hidden="true">
          {week.badges.map((b) => (
            <span key={b.id} className={`mini-badge ${b.status}`} title={`${b.name}: ${STATUS_TEXT[b.status]}`}>
              {b.emoji}
            </span>
          ))}
        </span>
        <b className="week-count">
          {week.earnedCount}/{week.badges.length}
        </b>
      </button>
      {open && (
        <div className="week-body">
          {week.badges.map((b, i) => (
            <BadgeTile key={b.id} badge={b} index={i} />
          ))}
        </div>
      )}
    </li>
  );
}

export function AchievementsPage({ achievements, today }) {
  const { weeks, milestones, earnedCount, totalCount } = achievements;
  const current = weeks.find((w) => w.current) ?? weeks.at(-1);
  const [openWeek, setOpenWeek] = useState(null);
  const shown = useCountUp(earnedCount, 1000);
  const crownCount = weeks.filter((w) => w.badges.find((b) => b.id === 'perfect').earned).length;
  const { settings } = useTracker();
  const treats = useTreats(today);
  const treatWeeks = treats.weeks.filter((w) => w.status !== 'upcoming' || w.current);

  return (
    <section className="view active achievements" aria-label="Achievements">
      <div className="panel trophy-hero">
        <div className="trophy" aria-hidden="true">
          🏆
        </div>
        <div>
          <h2 className="page-title">Achievements</h2>
          <p className="sub" style={{ margin: 0 }}>
            Badges unlock automatically when you complete a goal every day of a week.
          </p>
        </div>
        <div className="trophy-count">
          <b>{shown}</b>
          <span>of {totalCount} earned</span>
          <span>👑 {crownCount} perfect week{crownCount === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="panel">
        <h2>
          {current.label} · {formatDate(current.first, SHORT)} – {formatDate(current.last, SHORT)}
        </h2>
        <p className="sub">Keep every ring filling up until Sunday. The crown needs a 100 score every day.</p>
        <div className="badge-grid">
          {current.badges.map((b, i) => (
            <BadgeTile key={b.id} badge={b} index={i} />
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Treats 🎁</h2>
        <p className="sub">
          Hit {settings.rewardDays} good days in a week and treat yourself. Edit your treat list in Settings.
        </p>
        <div className="treat-list">
          {treatWeeks
            .slice()
            .reverse()
            .map((w) => (
              <TreatCard
                key={w.index}
                week={w}
                compact={w.current}
                rewards={treats.rewards}
                today={today}
                settings={settings}
                onPick={treats.pick}
                onEnjoyed={treats.enjoyed}
              />
            ))}
        </div>
      </div>

      <div className="panel">
        <h2>Trophy shelf</h2>
        <p className="sub">Every week of the challenge. Tap a week to see its badges.</p>
        <ul className="shelf">
          {weeks.map((w) => (
            <WeekRow
              key={w.index}
              week={w}
              open={openWeek === w.index}
              onToggle={() => setOpenWeek((o) => (o === w.index ? null : w.index))}
            />
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Milestones</h2>
        <p className="sub">Big goals across the whole challenge</p>
        <div className="milestones">
          {milestones.map((m, i) => (
            <div key={m.id} className={`milestone ${m.earned ? 'earned' : ''}`} style={{ '--i': i }}>
              <Badge badge={m} status={m.earned ? 'earned' : 'progress'} size={64} />
              <div className="milestone-text">
                <strong>{m.name}</strong>
                <span>{m.rule}</span>
                <div className="mini-meter">
                  <i style={{ width: `${Math.round(m.progress * 100)}%`, background: `var(${m.color})` }} />
                </div>
                <small>
                  {m.earned ? '✓ Earned' : `${Math.min(m.value, m.goal).toLocaleString()} / ${m.goal.toLocaleString()}`}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
