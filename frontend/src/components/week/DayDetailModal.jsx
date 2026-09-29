/** Popup showing exactly what was ticked off on one specific day. */
import { useEffect, useRef } from 'react';
import { ITEMS, sectionsFor } from '../../config/goals.js';
import { formatDate } from '../../lib/dates.js';
import { dayScore, isItemDone, isLogged, itemTarget } from '../../lib/scoring.js';

function itemStatus(item, day, settings, dateKey) {
  if (item.type === 'check') return isItemDone(item, day, settings, dateKey) ? 'Done' : 'Not done';
  if (item.type === 'slots') {
    const count = (day?.[item.id] ?? []).filter(Boolean).length;
    return `${count}/${item.slots} updates`;
  }
  const value = item.custom ? day?.custom?.[item.id] : day?.[item.id];
  const target = itemTarget(item, settings, dateKey);
  return `${value ?? 0}/${target}${item.unit ? ` ${item.unit}` : ''}`;
}

export function DayDetailModal({ dateKey, day, settings, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!dateKey) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dateKey, onClose]);

  if (!dateKey) return null;
  const sections = sectionsFor(settings);
  const logged = isLogged(ITEMS, day);
  const score = logged ? dayScore(sections, day, settings, dateKey) : null;

  return (
    <div className="daymodal-overlay" role="dialog" aria-modal="true" aria-labelledby="daymodal-title" onClick={onClose}>
      <div className="daymodal-card" onClick={(event) => event.stopPropagation()}>
        <div className="daymodal-head">
          <div>
            <h2 id="daymodal-title">{formatDate(dateKey, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <p className="sub">{logged ? `Score ${score}` : 'Nothing logged this day'}</p>
          </div>
          <button ref={closeRef} className="icon-x" type="button" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="daymodal-sections">
          {sections.map((section) => (
            <div key={section.id} className="daymodal-sec">
              <h3>
                <span className="dot" style={{ background: `var(${section.color})` }} />
                {section.name}
              </h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item.id} className={isItemDone(item, day, settings, dateKey) ? 'done' : ''}>
                    <span>{item.name}</span>
                    <b>{itemStatus(item, day, settings, dateKey)}</b>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
