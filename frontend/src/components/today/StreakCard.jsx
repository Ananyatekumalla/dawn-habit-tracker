/** Streak + a quick way to fix a day you forgot to log, without the big date-editor always on screen. */
import { useState } from 'react';
import { formatDate } from '../../lib/dates.js';
import { computeStreak, recentMissedDays } from '../../lib/summary.js';

export function StreakCard({ settings, days, today, dateKey, onEditDate }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { currentStreak, bestStreak } = computeStreak({ settings, days, today });
  const missed = recentMissedDays({ settings, days, today, limit: 3 });
  const editingPast = dateKey !== today;

  return (
    <div className="panel streak-card">
      <div className="streak-top">
        <div className="streak-num">
          <span className="streak-flame" aria-hidden="true">
            🔥
          </span>
          <div>
            <b>{currentStreak}</b>
            <span>
              {' '}
              day{currentStreak === 1 ? '' : 's'} in a row · best {bestStreak}
            </span>
          </div>
        </div>
        <button
          className="btn"
          type="button"
          aria-expanded={pickerOpen || editingPast}
          onClick={() => setPickerOpen((v) => !v)}
        >
          {pickerOpen || editingPast ? 'Close' : 'Edit a day'}
        </button>
      </div>

      {missed.length > 0 && (
        <div className="streak-missed">
          <span>Forgot to log:</span>
          {missed.map((date) => (
            <button key={date} className="chip-btn" type="button" onClick={() => onEditDate(date)}>
              {formatDate(date, { day: 'numeric', month: 'short' })}
            </button>
          ))}
        </div>
      )}

      {(pickerOpen || editingPast) && (
        <div className="streak-pick">
          <label htmlFor="day-to-edit">Pick a day to fix</label>
          <input
            id="day-to-edit"
            type="date"
            min={settings.start}
            max={today}
            value={dateKey}
            onChange={(event) => event.target.value && onEditDate(event.target.value)}
          />
          {editingPast && (
            <>
              <p>Editing {formatDate(dateKey)}. Changes are saved to this date.</p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  onEditDate(today);
                  setPickerOpen(false);
                }}
              >
                Back to today
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
