/** Night project picker: ideas per track, the current project, and hours spent on each. */
import { useMemo } from 'react';
import { PROJECTS, STUDY_TRACKS } from '../../config/goals.js';

const TRACK = Object.fromEntries(STUDY_TRACKS.map((t) => [t.id, t]));

export function ProjectsPanel({ settings, days, onPick }) {
  const hours = useMemo(() => {
    const totals = {};
    for (const day of Object.values(days)) {
      if (day?.project && day.projectId) totals[day.projectId] = (totals[day.projectId] ?? 0) + day.project;
    }
    return totals;
  }, [days]);

  return (
    <div className="panel">
      <h2>Night projects</h2>
      <p className="sub">
        {settings.projectHours} hours every night from {settings.projectTime}. Pick one project to build now; the
        hours you log on the Today tab count toward it.
      </p>
      <div className="projects">
        {PROJECTS.map((p, i) => {
          const current = p.id === settings.currentProject;
          const track = TRACK[p.track];
          return (
            <article key={p.id} className={`project-card pop ${current ? 'current' : ''}`} style={{ '--i': i, '--c': `var(${track.color})` }}>
              <div className="project-top">
                <span className="track-pill" style={{ '--c': `var(${track.color})` }}>
                  {track.emoji} {track.short}
                </span>
                {current && <span className="now-pill">Building now</span>}
              </div>
              <h3>{p.title}</h3>
              <p>{p.summary}</p>
              <small className="project-stack">{p.stack}</small>
              <div className="project-foot">
                <b>{hours[p.id] ?? 0}h</b>
                <span>logged</span>
                {!current && (
                  <button className="btn" onClick={() => onPick(p)}>
                    Build this next
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
