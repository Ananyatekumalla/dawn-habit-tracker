import { useLayoutEffect, useRef, useState } from 'react';

const ICONS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  today: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  study: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  week: 'M3 21h18 M6 17v-6 M11 17V5 M16 17v-9 M21 17v-3',
  awards: 'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M17 5h3v2a3 3 0 0 1-3 3 M7 5H4v2a3 3 0 0 0 3 3',
  journal: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  settings: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M15 4v4 M9 10v4 M17 16v4',
};

export const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'today', label: 'Today' },
  { id: 'study', label: 'Study' },
  { id: 'week', label: 'Week' },
  { id: 'awards', label: 'Awards' },
  { id: 'journal', label: 'Journal' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar({ active, onChange }) {
  const refs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0 });

  // Slide the highlight under the active tab (and follow resizes).
  useLayoutEffect(() => {
    const place = () => {
      const el = refs.current[active];
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active]);

  return (
    <nav className="tabs" role="tablist" aria-label="Sections">
      <span className="tab-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} aria-hidden="true" />
      {TABS.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => (refs.current[tab.id] = el)}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={ICONS[tab.id]} />
          </svg>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
