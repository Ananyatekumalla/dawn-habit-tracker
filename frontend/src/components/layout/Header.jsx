import { daysBetween, formatDate, todayKey } from '../../lib/dates.js';

const STATUS_TEXT = {
  loading: 'Connecting…',
  online: 'Synced',
  offline: 'Offline, saved on this device',
  local: 'Saved on this device',
  cloud: 'Saved to your account',
};

export function Header({ settings, status, onToggleTheme }) {
  const left = daysBetween(todayKey(), settings.end);
  return (
    <header className="top">
      <div className="brand">
        <span className="sunmark" aria-hidden="true" />
        Dawn
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span className={`status ${status === 'offline' ? 'offline' : ''}`}>
          <i aria-hidden="true" />
          {STATUS_TEXT[status]}
        </span>
        <div className="count">
          {left >= 0 ? (
            <>
              <b>{left}</b> days to {formatDate(settings.end, { day: 'numeric', month: 'short' })}
            </>
          ) : (
            'Challenge complete'
          )}
        </div>
        <button className="iconbtn" onClick={onToggleTheme} aria-label="Switch theme">
          ◐
        </button>
      </div>
    </header>
  );
}
