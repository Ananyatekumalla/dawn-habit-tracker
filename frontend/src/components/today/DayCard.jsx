import { PROMPTS } from '../../config/goals.js';
import { daysBetween, formatDate, formatTime, totalDays } from '../../lib/dates.js';
import { studyTarget } from '../../lib/scoring.js';

export function DayCard({ settings, dateKey, dealt, onDeal }) {
  const index = daysBetween(settings.start, dateKey);
  const length = totalDays(settings);
  const inRange = index >= 0 && index < length;
  const prompt = PROMPTS[(Math.abs(index) * 7) % PROMPTS.length];
  const chips = [
    `Up by ${formatTime(settings.wake)}`,
    `${settings.steps.toLocaleString()} steps`,
    `${settings.apps} applications`,
    `Study ${studyTarget(settings, dateKey)}h`,
  ];

  let subtitle = `of ${length} days`;
  if (index < 0) subtitle = `Starts ${formatDate(settings.start, { day: 'numeric', month: 'short' })}`;
  else if (!inRange) subtitle = 'Challenge finished';

  return (
    <div className="card-stage">
      <div className={`daycard ${dealt ? 'dealt' : ''}`}>
        <div className="face back" aria-hidden={dealt}>
          <div className="pattern" />
          <div style={{ position: 'relative' }}>
            <p>{inRange ? `Day ${index + 1} is waiting` : "Today's card is ready"}</p>
            <button onClick={onDeal} tabIndex={dealt ? -1 : 0}>
              Turn over today&apos;s card
            </button>
          </div>
        </div>
        <div className="face front" aria-hidden={!dealt}>
          <div className="sun" aria-hidden="true" />
          <div className="num">{inRange ? index + 1 : index < 0 ? 0 : length}</div>
          <div className="of">{subtitle}</div>
          <div className="date">{formatDate(dateKey)}</div>
          <div className="targets">
            {chips.map((chip) => (
              <span className="chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
          <div className="prompt">
            <small>Today&apos;s focus</small>
            <p>{prompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
