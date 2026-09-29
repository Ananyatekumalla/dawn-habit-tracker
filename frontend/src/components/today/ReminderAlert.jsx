import { formatTime } from '../../lib/dates.js';

export function ReminderAlert({ reminder, onDone, onLater }) {
  return (
    <div className={`alert ${reminder ? 'show' : ''}`} role="alert" aria-hidden={!reminder}>
      {reminder && (
        <>
          <p>
            {reminder.label}
            <small>{formatTime(reminder.time)} reminder</small>
          </p>
          {reminder.patch && <button onClick={onDone}>Done</button>}
          <button className="ghost" onClick={onLater}>
            Later
          </button>
        </>
      )}
    </div>
  );
}
