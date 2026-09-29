/** Home: a friendly summary of the whole challenge so far. */
import { useMemo } from 'react';
import { ChartCanvas } from '../components/common/ChartCanvas.jsx';
import { JourneyPath } from '../components/home/JourneyPath.jsx';
import { Mascot } from '../components/home/Mascot.jsx';
import { TreatCard } from '../components/home/TreatCard.jsx';
import { STUDY_TRACKS } from '../config/goals.js';
import { useCountUp } from '../hooks/useCountUp.js';
import { useTracker } from '../hooks/useTracker.jsx';
import { useTreats } from '../hooks/useTreats.js';
import { baseOptions, bottomLegend, cssVar } from '../lib/charts.js';
import { allDates, formatDate } from '../lib/dates.js';
import { buildSummary, movingAverage } from '../lib/summary.js';

function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function sunnySays(summary, hour) {
  const { todayScore, currentStreak } = summary;
  if (todayScore >= 90) return 'You are glowing today! Nearly everything done. 🌟';
  if (currentStreak >= 3) return `${currentStreak} strong days in a row. Don't break the chain!`;
  if (todayScore >= 40) return "Nice progress. Let's finish the rest of today's list.";
  if (hour < 10) return "Rise and shine! Your day's card is waiting.";
  return "Small steps count. Tick off one thing right now.";
}

function moodFor(score) {
  if (score >= 90) return 'star';
  if (score >= 40) return 'happy';
  return 'sleepy';
}

function Tile({ icon, value, suffix = '', label, index }) {
  // Count up in tenths so decimals like 62.4 kg animate too.
  const shown = useCountUp(Math.round(value * 10), 900) / 10;
  return (
    <div className="tile" style={{ '--i': index }}>
      <span className="tile-icon" aria-hidden="true">
        {icon}
      </span>
      <b>
        {shown.toLocaleString()}
        {suffix}
      </b>
      <span>{label}</span>
    </div>
  );
}

function TrackRing({ track, progress, index }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="track-ring" style={{ '--i': index }}>
      <svg viewBox="0 0 80 80" width="84" height="84" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={`var(${track.color})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress.pct / 100)}
          className="ring-grow"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="46" textAnchor="middle" fontSize="18">
          {track.emoji}
        </text>
      </svg>
      <strong>{track.name}</strong>
      <span>
        {progress.done} of {progress.total} topics · {progress.pct}%
      </span>
    </div>
  );
}

export function HomePage({ today, now, onNavigate }) {
  const { settings, days, topics } = useTracker();
  const summary = useMemo(() => buildSummary({ settings, days, topics, today }), [settings, days, topics, today]);
  const hour = now.getHours();
  const treats = useTreats(today);

  // The journey shows every day of the challenge, including future ones.
  const journey = useMemo(() => {
    const known = Object.fromEntries(summary.scores.map((s) => [s.date, s.score]));
    return allDates(settings).map((date) => ({ date, score: known[date] ?? null }));
  }, [settings, summary.scores]);

  const charts = useMemo(() => {
    const base = baseOptions();
    const [sky, sun, rose, line] = ['--sky', '--sun', '--rose', '--line'].map(cssVar);
    const labels = summary.scores.map((s) => formatDate(s.date, { day: 'numeric', month: 'short' }));
    const values = summary.scores.map((s) => s.score);
    return {
      trend: {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Daily score', data: values, borderColor: sky, backgroundColor: `${sky}26`, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: sun, spanGaps: true },
            { label: '7-day average', data: movingAverage(values), borderColor: rose, borderDash: [6, 5], pointRadius: 0, tension: 0.4, spanGaps: true },
          ],
        },
        options: {
          ...base,
          animation: { duration: 1400, easing: 'easeOutQuart' },
          plugins: { legend: bottomLegend },
          scales: { ...base.scales, y: { ...base.scales.y, min: 0, max: 100 } },
        },
      },
      studyWeeks: {
        type: 'bar',
        data: {
          labels: summary.weeks.map((w) => w.label),
          datasets: [
            { label: 'Target', data: summary.weeks.map((w) => w.studyTarget), backgroundColor: line, borderRadius: 10, barPercentage: 0.75, grouped: false },
            { label: 'Studied', data: summary.weeks.map((w) => w.studyHours), backgroundColor: sun, borderRadius: 10, barPercentage: 0.45, grouped: false },
            { type: 'line', label: 'Project', data: summary.weeks.map((w) => w.projectHours), borderColor: rose, backgroundColor: rose, tension: 0.35, pointRadius: 4 },
          ],
        },
        options: { ...base, animation: { duration: 1200, easing: 'easeOutBack' }, plugins: { legend: bottomLegend } },
      },
      weight: {
        type: 'line',
        data: {
          labels: summary.weights.map((w) => formatDate(w.date, { day: 'numeric', month: 'short' })),
          datasets: [
            { label: 'Weight (kg)', data: summary.weights.map((w) => w.weight), borderColor: cssVar('--leaf'), backgroundColor: `${cssVar('--leaf')}22`, fill: true, tension: 0.35, pointRadius: 4 },
            ...(settings.goalWeight
              ? [{ label: 'Goal', data: summary.weights.map(() => settings.goalWeight), borderColor: cssVar('--muted'), borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 }]
              : []),
          ],
        },
        options: { ...base, plugins: { legend: bottomLegend }, scales: { ...base.scales, y: { ...base.scales.y, grace: '5%' } } },
      },
      topicsWeeks: {
        type: 'bar',
        data: {
          labels: summary.weeks.map((w) => w.label),
          datasets: STUDY_TRACKS.map((t) => ({
            label: t.short,
            data: summary.weeks.map((w) => w.topics[t.id]),
            backgroundColor: cssVar(t.color),
            borderRadius: 6,
          })),
        },
        options: {
          ...base,
          plugins: { legend: bottomLegend },
          scales: { x: { ...base.scales.x, stacked: true }, y: { ...base.scales.y, stacked: true, ticks: { precision: 0 } } },
        },
      },
    };
  }, [summary, settings.goalWeight]);

  const tiles = [
    { icon: '☀️', value: summary.todayScore, label: "Today's score" },
    { icon: '📈', value: summary.avgScore, label: 'Average score' },
    { icon: '🔥', value: summary.currentStreak, suffix: 'd', label: `Streak · best ${summary.bestStreak}d` },
    { icon: '📚', value: summary.topicsDone, label: 'Topics covered' },
    { icon: '💼', value: summary.totalApps, label: 'Applications sent' },
    { icon: '👟', value: summary.avgSteps, label: 'Average steps' },
    { icon: '🛠️', value: summary.totalProjectHours, suffix: 'h', label: 'Project hours' },
    {
      icon: '⚖️',
      value: summary.latestWeight ?? 0,
      suffix: ' kg',
      label:
        summary.weightChange === null
          ? 'Latest weight'
          : `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg since start`,
    },
  ];

  return (
    <section className="view active home" aria-label="Home">
      <div className="panel hero">
        <div className="hero-top">
          <Mascot mood={moodFor(summary.todayScore)} />
          <div className="hero-text">
            <h1>
              {greeting(hour)}
              {settings.name ? `, ${settings.name}` : ''}
            </h1>
            <p className="bubble">{sunnySays(summary, hour)}</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={() => onNavigate('today')}>
                Open today&apos;s checklist
              </button>
              <button className="btn" onClick={() => onNavigate('study')}>
                Plan study topics
              </button>
            </div>
          </div>
          <div className="hero-day" aria-label={`Day ${summary.dayNumber} of ${summary.totalDays}`}>
            <b>{summary.dayNumber}</b>
            <span>of {summary.totalDays} days</span>
            <div className="mini-meter">
              <i style={{ width: `${summary.journeyPct}%` }} />
            </div>
          </div>
        </div>
        <JourneyPath scores={journey} start={settings.start} end={settings.end} todayIndex={summary.dayNumber - 1} />
      </div>

      <div className="panel pop treat-panel" style={{ '--i': 1 }}>
        <TreatCard
          compact
          week={treats.current}
          rewards={treats.rewards}
          today={today}
          settings={settings}
          onPick={treats.pick}
          onEnjoyed={treats.enjoyed}
        />
      </div>

      <div className="tiles">
        {tiles.map((t, i) => (
          <Tile key={t.label} index={i} {...t} />
        ))}
      </div>

      <div className="charts">
        <div className="panel pop" style={{ '--i': 6, gridColumn: '1 / -1' }}>
          <h2>Your score over time</h2>
          <p className="sub">Every logged day, with a 7-day average to show the trend</p>
          <div className="chartbox" style={{ height: 280 }}>
            <ChartCanvas config={charts.trend} label="Daily score over time" />
          </div>
        </div>
        <div className="panel pop" style={{ '--i': 7 }}>
          <h2>Study and project hours per week</h2>
          <p className="sub">Study against your rising target, plus night project hours</p>
          <div className="chartbox">
            <ChartCanvas config={charts.studyWeeks} label="Study hours per week" />
          </div>
        </div>
        <div className="panel pop" style={{ '--i': 8 }}>
          <h2>Weight</h2>
          <p className="sub">
            {summary.weights.length ? 'Every day you logged it' : 'Log your weight on the Today tab to see the trend'}
          </p>
          <div className="chartbox">
            {summary.weights.length ? (
              <ChartCanvas config={charts.weight} label="Weight over time" />
            ) : (
              <div className="empty-chart" aria-hidden="true">
                ⚖️
              </div>
            )}
          </div>
        </div>
        <div className="panel pop" style={{ '--i': 9, gridColumn: '1 / -1' }}>
          <h2>Topics covered per week</h2>
          <p className="sub">Stacked by study track</p>
          <div className="chartbox">
            <ChartCanvas config={charts.topicsWeeks} label="Topics covered per week by track" />
          </div>
        </div>
      </div>

      <div className="home-split">
        <div className="panel pop" style={{ '--i': 10 }}>
          <h2>Study tracks</h2>
          <p className="sub">All topics you&apos;ve planned, and how many are done</p>
          <div className="track-rings">
            {STUDY_TRACKS.map((t, i) => (
              <TrackRing key={t.id} track={t} progress={summary.tracks[t.id]} index={i} />
            ))}
          </div>
        </div>
        <div className="panel pop" style={{ '--i': 11 }}>
          <h2>Balance across your goals</h2>
          <p className="sub">Average completion on logged days</p>
          <div className="balance">
            {summary.sections.map((s, i) => (
              <div key={s.id} className="balance-row" style={{ '--i': i }}>
                <span>{s.name}</span>
                <div className="balance-bar">
                  <i style={{ width: `${s.pct}%`, background: `var(${s.color})` }} />
                </div>
                <b>{s.pct}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
