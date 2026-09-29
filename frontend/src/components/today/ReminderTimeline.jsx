import { useState } from 'react';
import { formatTime } from '../../lib/dates.js';
import { burst } from '../../lib/burst.js';

function notificationsSupported() {
  try {
    return 'Notification' in window && Notification.permission !== 'denied';
  } catch {
    return false;
  }
}

export function ReminderTimeline({ reminders, onMark, onInfo }) {
  const [permission, setPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  );

  const askPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      onInfo(result === 'granted' ? 'Notifications turned on' : 'In-app alerts will still show');
    } catch {
      setPermission('unsupported');
    }
  };

  return (
    <div className="panel remind">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2>Today&apos;s reminders</h2>
          <p className="sub" style={{ margin: 0 }}>
            Alerts pop up while Dawn is open. Tap a reminder to mark it done.
          </p>
        </div>
        {permission === 'default' && (
          <button className="btn" onClick={askPermission}>
            Turn on notifications
          </button>
        )}
      </div>
      <div className="tl" style={{ marginTop: 16 }}>
        {reminders.map((r) => (
          <button
            key={r.id}
            className={`rem ${r.state}`}
            aria-label={`${formatTime(r.time)}, ${r.label}, ${r.state}`}
            onClick={(e) => {
              if (r.state === 'done') return;
              if (!r.patch) {
                return onInfo(
                  r.id === 'apps'
                    ? 'Add applications in the Job search section'
                    : r.id === 'project'
                      ? 'Log your project hours in Study & build'
                      : 'Update the count on the Today checklist',
                );
              }
              burst(e.currentTarget);
              onMark(r.patch);
              onInfo('Marked done');
            }}
          >
            <time>{formatTime(r.time)}</time>
            <span>{r.label}</span>
            {r.state === 'due' && (
              <span style={{ display: 'block', color: 'var(--rose)', fontWeight: 700, marginTop: 4 }}>
                Due now
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
