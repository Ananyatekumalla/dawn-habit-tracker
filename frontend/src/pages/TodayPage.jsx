import { useCallback } from 'react';
import { DayCard } from '../components/today/DayCard.jsx';
import { ReminderAlert } from '../components/today/ReminderAlert.jsx';
import { ReminderTimeline } from '../components/today/ReminderTimeline.jsx';
import { RunGrid } from '../components/today/RunGrid.jsx';
import { ScoreRing } from '../components/today/ScoreRing.jsx';
import { SectionBlock } from '../components/today/SectionBlock.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { WeightCard } from '../components/today/WeightCard.jsx';
import { sectionsFor } from '../config/goals.js';
import { useReminders } from '../hooks/useReminders.js';
import { useTracker } from '../hooks/useTracker.jsx';
import { dayScore, scoreLevel } from '../lib/scoring.js';

const EMPTY_DAY = {};

export function TodayPage({ today, now, onOpenDay }) {
  const { settings, days, updateDay, saveSettings } = useTracker();
  const toast = useToast();
  const day = days[today] ?? EMPTY_DAY;
  const sections = sectionsFor(settings);
  const score = dayScore(sections, day, settings, today);

  const onChange = useCallback((patch) => updateDay(today, patch), [updateDay, today]);
  const { reminders, active, dismiss, snooze } = useReminders(settings, day, now);

  const addGoal = async (habit) => {
    const result = await saveSettings({ ...settings, customHabits: [...(settings.customHabits ?? []), habit] });
    toast(result.ok ? `Added: ${habit.name}` : result.message);
  };
  const removeGoal = async (item) => {
    if (!window.confirm(`Remove "${item.name}"? Its past ticks stay in your history.`)) return;
    await saveSettings({ ...settings, customHabits: settings.customHabits.filter((h) => h.id !== item.id) });
    toast(`Removed: ${item.name}`);
  };

  const markActiveDone = () => {
    onChange(active.patch);
    dismiss();
    toast('Marked done');
  };

  return (
    <section className="view active" aria-label="Today">
      <div className="today">
        <DayCard
          settings={settings}
          dateKey={today}
          dealt={Boolean(day.dealt)}
          onDeal={() => onChange({ dealt: true })}
        />
        <div className="panel">
          <ScoreRing score={score} level={scoreLevel(score)} />
          <div className="sections">
            {sections.map((section) => (
              <SectionBlock
                key={section.id}
                section={section}
                day={day}
                settings={settings}
                dateKey={today}
                onChange={onChange}
                onAddGoal={addGoal}
                onRemoveGoal={removeGoal}
              />
            ))}
          </div>
          <WeightCard days={days} dateKey={today} goalWeight={settings.goalWeight} onChange={onChange} />
        </div>
      </div>

      <ReminderTimeline reminders={reminders} onMark={onChange} onInfo={toast} />
      <RunGrid settings={settings} days={days} today={today} onOpenDay={onOpenDay} />
      <ReminderAlert reminder={active} onDone={markActiveDone} onLater={snooze} />
    </section>
  );
}
