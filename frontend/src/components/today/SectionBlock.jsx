import { useCallback } from 'react';
import { CUSTOM_RULES } from '../../config/goals.js';
import { sectionMax, sectionPoints } from '../../lib/scoring.js';
import { AddGoalForm } from './AddGoalForm.jsx';
import { HabitRow } from './HabitRow.jsx';

export function SectionBlock({ section, day, settings, dateKey, onChange, onAddGoal, onRemoveGoal, isOpen, onToggle }) {
  const percent = Math.round((sectionPoints(section, day, settings, dateKey) / sectionMax(section)) * 100);
  const color = `var(${section.color})`;
  const customCount = section.items.filter((i) => i.custom).length;

  // Custom goals keep their values under day.custom so they never clash with built-in fields.
  const onCustomChange = useCallback(
    (patch) => onChange({ custom: { ...day.custom, ...patch } }),
    [onChange, day.custom],
  );

  return (
    <div className={`sec ${isOpen ? 'open' : ''}`}>
      <button type="button" className="sechead" onClick={onToggle} aria-expanded={isOpen}>
        <span className="dot" style={{ background: color }} />
        <h3>{section.name}</h3>
        <span className="pct">{percent}%</span>
        <span className="chev" aria-hidden="true">
          ⌄
        </span>
      </button>
      <div className="secbar">
        <i style={{ background: color, width: `${percent}%` }} />
      </div>
      {isOpen && (
        <div className="habits">
          {section.items.map((item) =>
            item.custom ? (
              <HabitRow
                key={item.id}
                item={item}
                day={{ ...day, [item.id]: day.custom?.[item.id] }}
                settings={settings}
                dateKey={dateKey}
                onChange={onCustomChange}
                onRemove={onRemoveGoal}
              />
            ) : (
              <HabitRow key={item.id} item={item} day={day} settings={settings} dateKey={dateKey} onChange={onChange} />
            ),
          )}
          {customCount < CUSTOM_RULES.maxPerSection && <AddGoalForm section={section} onAdd={onAddGoal} />}
        </div>
      )}
    </div>
  );
}
