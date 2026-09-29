/** Daily weight log with the change since your last entry. Not part of the score. */
import { useMemo } from 'react';

export function WeightCard({ days, dateKey, goalWeight, onChange }) {
  const value = days[dateKey]?.weight ?? '';

  const previous = useMemo(() => {
    const earlier = Object.keys(days)
      .filter((k) => k < dateKey && days[k]?.weight)
      .sort();
    const last = earlier.at(-1);
    return last ? { date: last, weight: days[last].weight } : null;
  }, [days, dateKey]);

  const delta = value && previous ? Math.round((value - previous.weight) * 10) / 10 : null;
  const toGoal = value && goalWeight ? Math.round((value - goalWeight) * 10) / 10 : null;

  return (
    <div className="weight-card">
      <span className="weight-icon" aria-hidden="true">
        ⚖️
      </span>
      <div className="txt">
        <strong>Weight today</strong>
        <span>
          {delta === null
            ? previous
              ? `Last: ${previous.weight} kg`
              : 'Log it each morning for the trend'
            : `${delta > 0 ? '+' : ''}${delta} kg since last entry`}
          {toGoal !== null && ` · ${Math.abs(toGoal)} kg ${toGoal > 0 ? 'above' : 'below'} goal`}
        </span>
      </div>
      <label className="weight-input">
        <input
          type="number"
          inputMode="decimal"
          min="20"
          max="400"
          step="0.1"
          placeholder="0.0"
          value={value}
          aria-label="Weight in kilograms"
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange({ weight: e.target.value === '' || !n ? null : Math.round(n * 10) / 10 });
          }}
        />
        <span>kg</span>
      </label>
    </div>
  );
}
