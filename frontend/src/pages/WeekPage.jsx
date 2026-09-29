/** Weekly review. Numbers come from the Python report endpoints. */
import { useEffect, useMemo, useState } from 'react';
import { API_ENABLED, api } from '../api/client.js';
import { ChartCanvas } from '../components/common/ChartCanvas.jsx';
import { RunGrid } from '../components/today/RunGrid.jsx';
import { DayDetailModal } from '../components/week/DayDetailModal.jsx';
import { ITEMS, SECTIONS, STUDY_TRACKS, sectionsFor } from '../config/goals.js';
import { useTracker } from '../hooks/useTracker.jsx';
import { baseOptions, bottomLegend, cssVar } from '../lib/charts.js';
import { allDates, daysBetween, formatDate, totalDays } from '../lib/dates.js';
import { dayScore, isLogged, scoreLevel } from '../lib/scoring.js';

const REFRESH_DELAY_MS = 800;

function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function ChartPanel({ title, sub, height = 260, wide = false, children }) {
  return (
    <div className="panel" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <h2>{title}</h2>
      <p className="sub">{sub}</p>
      <div className="chartbox" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

function useReports(weekIndex, today, days) {
  const [state, setState] = useState({ week: null, overall: null, error: '' });
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      Promise.all([api.getWeekReport(weekIndex), api.getOverallReport(today)])
        .then(([week, overall]) => !cancelled && setState({ week, overall, error: '' }))
        .catch((e) => !cancelled && setState((s) => ({ ...s, error: e.message })));
    }, REFRESH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [weekIndex, today, days]); // refetch after edits so charts stay current
  return state;
}

export function WeekPage({ today, theme, onOpenDay }) {
  const { settings, days } = useTracker();
  const weekCount = Math.ceil(totalDays(settings) / 7);
  const currentWeek = Math.min(weekCount - 1, Math.max(0, Math.floor(daysBetween(settings.start, today) / 7)));
  const [weekIndex, setWeekIndex] = useState(currentWeek);
  const { week, overall, error } = useReports(weekIndex, today, days);
  const [detailDate, setDetailDate] = useState(null);

  // Computed straight from local data so it works even when the report API is unreachable.
  const weekDates = useMemo(
    () => allDates(settings).slice(weekIndex * 7, weekIndex * 7 + 7),
    [settings, weekIndex],
  );

  const charts = useMemo(() => {
    if (!week) return null;
    const base = baseOptions();
    const labels = week.days.map((d) => formatDate(d.date, { weekday: 'short' }));
    const colors = Object.fromEntries(SECTIONS.map((s) => [s.id, cssVar(s.color)]));
    const [leaf, sky, rose, line, muted] = ['--leaf', '--sky', '--rose', '--line', '--muted'].map(cssVar);
    const consistency = ITEMS.map((i) => week.consistency[i.id]);
    const earned = SECTIONS.map((s) => week.sectionPoints[s.id]);
    const hasPoints = earned.some((v) => v > 0);

    return {
      score: {
        type: 'bar',
        data: {
          labels,
          datasets: SECTIONS.map((s) => ({
            label: s.name,
            data: week.days.map((d) => Math.round(d.sections[s.id])),
            backgroundColor: colors[s.id],
            borderRadius: 4,
          })),
        },
        options: {
          ...base,
          plugins: { legend: bottomLegend },
          scales: { x: { ...base.scales.x, stacked: true }, y: { ...base.scales.y, stacked: true, min: 0, max: 100 } },
        },
      },
      steps: {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { type: 'line', label: 'Goal', data: week.days.map(() => settings.steps), borderColor: muted, borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 },
            { type: 'bar', label: 'Steps', data: week.days.map((d) => d.steps), backgroundColor: leaf, borderRadius: 8 },
          ],
        },
        options: { ...base, plugins: { legend: bottomLegend } },
      },
      pie: {
        type: 'doughnut',
        data: {
          labels: SECTIONS.map((s) => s.name),
          datasets: [{ data: hasPoints ? earned : [1], backgroundColor: hasPoints ? SECTIONS.map((s) => colors[s.id]) : [line], borderColor: cssVar('--surface'), borderWidth: 3 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          animation: { animateRotate: true, duration: 1100 },
          plugins: { legend: { ...bottomLegend, display: hasPoints, position: 'right' }, tooltip: { enabled: hasPoints } },
        },
      },
      habits: {
        type: 'bar',
        data: {
          labels: ITEMS.map((i) => i.name),
          datasets: [{ data: consistency, backgroundColor: consistency.map((v) => (v >= 80 ? leaf : v >= 50 ? sky : rose)), borderRadius: 6 }],
        },
        options: {
          ...base,
          indexAxis: 'y',
          scales: {
            x: { min: 0, max: 100, grid: { color: line }, border: { display: false }, ticks: { callback: (v) => `${v}%` } },
            y: { grid: { display: false }, border: { color: line } },
          },
        },
      },
      study: {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Target', data: week.days.map((d) => d.studyTarget), backgroundColor: line, borderRadius: 8, barPercentage: 0.7, grouped: false },
            { label: 'Studied', data: week.days.map((d) => d.study), backgroundColor: rose, borderRadius: 8, barPercentage: 0.4, grouped: false },
          ],
        },
        options: { ...base, plugins: { legend: bottomLegend } },
      },
    };
    // theme is a dependency so colours are re-read after switching light/dark
  }, [week, settings.steps, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = week?.days[0]?.date;
  const last = week?.days.at(-1)?.date;
  const short = { day: 'numeric', month: 'short' };
  const s = week?.summary;

  return (
    <section className="view active" aria-label="Weekly review">
      <div className="weekbar">
        <h2>
          Week {weekIndex + 1}
          {first && ` · ${formatDate(first, short)} – ${formatDate(last, short)}`}
        </h2>
        <div className="pager">
          <button disabled={weekIndex === 0} onClick={() => setWeekIndex((w) => w - 1)}>
            Previous
          </button>
          <button disabled={weekIndex >= weekCount - 1} onClick={() => setWeekIndex((w) => w + 1)}>
            Next
          </button>
        </div>
      </div>

      <div className="daystrip">
        {weekDates.map((date) => {
          const day = days[date];
          const logged = isLogged(ITEMS, day);
          const dayScoreValue = logged ? dayScore(sectionsFor(settings), day, settings, date) : null;
          return (
            <button
              key={date}
              type="button"
              className={`daychip l${scoreLevel(dayScoreValue)} ${date === today ? 'today' : ''} ${date > today ? 'future' : ''}`}
              disabled={date > today}
              onClick={() => setDetailDate(date)}
              aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${dayScoreValue !== null ? `, score ${dayScoreValue}` : ', not logged'}`}
            >
              <span>{formatDate(date, { weekday: 'short' })}</span>
              <b>{formatDate(date, { day: 'numeric' })}</b>
            </button>
          );
        })}
      </div>

      {error && !week && (
        <div className="panel empty">
          {API_ENABLED ? (
            <>
              Weekly reports come from the Python backend, which isn&apos;t reachable right now. Start it
              with <code>python run.py</code> and reload.
            </>
          ) : (
            'Weekly reports come from the Python backend. Run the full project to see them. The Home tab shows your overall progress meanwhile.'
          )}
        </div>
      )}

      {s && (
        <div className="stats eight">
          <Stat value={s.avgScore} label="Average score" />
          <Stat value={s.avgSteps.toLocaleString()} label="Average steps" />
          <Stat value={`${s.apps}/${s.appsTarget}`} label="Applications sent" />
          <Stat value={`${s.naukri}/${s.naukriTarget}`} label="Naukri updates" />
          <Stat value={`${s.gymDays}/${week.days.length}`} label="Gym days" />
          <Stat value={`${s.studyHours}h`} label={`Studied of ${s.studyTarget}h`} />
          <Stat value={`${s.projectHours}h`} label={`Night project of ${s.projectTarget}h`} />
          <Stat
            value={s.weightEnd ? `${s.weightEnd} kg` : '–'}
            label={
              s.weightStart && s.weightEnd && s.weightStart !== s.weightEnd
                ? `${s.weightEnd - s.weightStart > 0 ? '+' : ''}${Math.round((s.weightEnd - s.weightStart) * 10) / 10} kg this week`
                : 'Weight'
            }
          />
        </div>
      )}

      {charts && (
        <div className="charts">
          <ChartPanel title="Daily score by section" sub="Each bar adds up to that day's score out of 100">
            <ChartCanvas config={charts.score} label="Daily score by section" />
          </ChartPanel>
          <ChartPanel title="Steps" sub="Daily steps against your goal">
            <ChartCanvas config={charts.steps} label="Steps per day" />
          </ChartPanel>
          <ChartPanel title="Where your points came from" sub="Share of the week's earned points">
            <ChartCanvas config={charts.pie} label="Points by section" />
          </ChartPanel>
          <ChartPanel title="Habit consistency" sub="Days completed out of days logged" height={340}>
            <ChartCanvas config={charts.habits} label="Habit consistency" />
          </ChartPanel>
          <ChartPanel title="Study hours" sub="Logged against the day's target" wide>
            <ChartCanvas config={charts.study} label="Study hours" />
          </ChartPanel>
        </div>
      )}

      {week?.study && (
        <div className="panel verdict">
          <h2>Topics this week</h2>
          <p className="sub">Covered out of planned, per track</p>
          <div className="stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            {STUDY_TRACKS.map((t) => (
              <Stat
                key={t.id}
                value={`${week.study[t.id].covered}/${week.study[t.id].planned}`}
                label={`${t.emoji} ${t.name}`}
              />
            ))}
          </div>
        </div>
      )}

      {week && (
        <div className="panel verdict">
          <h2>Week check</h2>
          <p className="sub">What the numbers say about this week</p>
          <ul>
            {week.verdict.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {overall && (
        <div className="panel verdict">
          <h2>Overall so far</h2>
          <div className="stats" style={{ margin: '12px 0 0' }}>
            <Stat value={overall.avgScore} label="Average score" />
            <Stat value={`${overall.currentStreak} days`} label="Current streak" />
            <Stat value={`${overall.bestStreak} days`} label="Best streak" />
            <Stat value={`${overall.totalApps} · ${Math.round(overall.totalSteps / 1000)}k`} label="Applications · steps" />
          </div>
        </div>
      )}

      <RunGrid settings={settings} days={days} today={today} onOpenDay={onOpenDay} />

      <DayDetailModal
        dateKey={detailDate}
        day={days[detailDate] ?? {}}
        settings={settings}
        onClose={() => setDetailDate(null)}
      />
    </section>
  );
}
