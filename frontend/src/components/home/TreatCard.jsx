/** One week's treat: good-day faces, progress, and picking or ticking off the reward. */
import { moodFor } from '../../config/goals.js';
import { formatDate } from '../../lib/dates.js';

const SHORT = { day: 'numeric', month: 'short' };

export function WeekFaces({ week, today }) {
  return (
    <div className="week-faces" aria-label="This week's days">
      {week.dates.map((date, i) => {
        const score = week.scores[i];
        const future = date > today;
        return (
          <div key={date} className={`face-day ${future ? 'future' : ''} ${date === today ? 'today' : ''}`} style={{ '--i': i }}>
            <span className="face-emoji" title={score === null ? 'Not logged' : `${score}`}>
              {future ? '·' : score === null ? '😶' : moodFor(score).emoji}
            </span>
            <small>{formatDate(date, { weekday: 'short' })}</small>
          </div>
        );
      })}
    </div>
  );
}

export function TreatCard({ week, rewards, today, settings, onPick, onEnjoyed, compact = false }) {
  const reward = rewards.find((r) => r.id === week.rewardId);
  const toGo = Math.max(0, week.needed - week.goodDays);

  let message;
  if (week.earned && reward) message = week.enjoyed ? `Enjoyed: ${reward.emoji} ${reward.name}` : `Your treat: ${reward.emoji} ${reward.name}`;
  else if (week.earned) message = 'Treat earned! Pick one below';
  else if (week.status === 'missed') message = 'No treat this week. Next week is a fresh start';
  else if (week.status === 'upcoming') message = `Starts ${formatDate(week.dates[0], SHORT)}`;
  else message = `${toGo} more good day${toGo === 1 ? '' : 's'} for a treat`;

  return (
    <div className={`treat-card ${week.earned ? 'earned' : ''} ${week.enjoyed ? 'enjoyed' : ''}`}>
      <div className="treat-head">
        <span className="treat-gift" aria-hidden="true">
          {week.enjoyed && reward ? reward.emoji : '🎁'}
        </span>
        <div>
          <strong>
            {compact ? 'This week\u2019s treat' : `Week ${week.index + 1}`}
            <span className="treat-dates">
              {' '}
              · {formatDate(week.dates[0], SHORT)} – {formatDate(week.dates.at(-1), SHORT)}
            </span>
          </strong>
          <span className="treat-msg">{message}</span>
        </div>
        <b className="treat-count">
          {week.goodDays}/{week.needed}
        </b>
      </div>
      <div className="treat-meter" aria-hidden="true">
        <i style={{ width: `${Math.min(100, (week.goodDays / week.needed) * 100)}%` }} />
      </div>
      {compact && <WeekFaces week={week} today={today} />}
      <p className="treat-rule">
        A good day is a score of {settings.rewardScore}+. {settings.rewardDays} good days in a week earns a treat.
      </p>
      {week.earned && !week.enjoyed && (
        <div className="reward-picks" role="radiogroup" aria-label="Pick your treat">
          {rewards.map((r) => (
            <button key={r.id} role="radio" aria-checked={week.rewardId === r.id} onClick={() => onPick(week.index, r.id)}>
              {r.emoji} {r.name}
            </button>
          ))}
        </div>
      )}
      {week.earned && reward && (
        <button className="btn enjoyed-btn" onClick={() => onEnjoyed(week.index, !week.enjoyed)}>
          {week.enjoyed ? 'Undo' : `I enjoyed my ${reward.name.toLowerCase()} ✓`}
        </button>
      )}
    </div>
  );
}
