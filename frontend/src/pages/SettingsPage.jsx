import { useState } from 'react';
import { SECTIONS } from '../config/goals.js';
import { formatTime } from '../lib/dates.js';
import { makeId } from '../lib/topics.js';
import { useToast } from '../components/common/Toast.jsx';
import { useTracker } from '../hooks/useTracker.jsx';

/** Form layout: [group title, [[field, label, input type, extra props]]] */
const GROUPS = [
  ['You', [['name', 'Your name (for the greeting)', 'text', { maxLength: 40 }]]],
  [
    'Reminders',
    [['remindersEnabled', 'Show reminders and alerts', 'checkbox']],
    'Turn off to hide the reminder timeline, pop-up alerts and notifications. Your goals and their times stay the same.',
  ],
  ['Challenge', [['start', 'Start date', 'date'], ['end', 'End date', 'date']]],
  ['Morning', [['wake', 'Wake up by', 'time']]],
  ['Body', [['goalWeight', 'Goal weight in kg (optional, 0 = none)', 'number', { min: 0, max: 400, step: 0.1 }]]],
  ['Health', [
    ['meds', 'Medicine doses per day', 'number', { min: 1, max: 6 }],
    ['medTime', 'Medicine reminder', 'time'],
    ['lunchWalk', 'Walk after lunch at', 'time'],
    ['dinnerWalk', 'Walk after dinner at', 'time'],
    ['steps', 'Daily steps goal', 'number', { min: 1000, max: 40000, step: 500 }],
    ['fast', 'Fasting goal (hours)', 'number', { min: 12, max: 24 }],
  ]],
  ['Job search', [
    ['apps', 'Applications per day', 'number', { min: 1, max: 30 }],
    ['applyBy', 'Applications reminder (if not done)', 'time'],
  ]],
  ['Treats', [
    ['rewardDays', 'Good days needed per week', 'number', { min: 1, max: 7 }],
    ['rewardScore', 'Score that counts as a good day', 'number', { min: 10, max: 100, step: 5 }],
  ]],
  ['Study & build', [
    ['studyFrom', 'Starting study hours', 'number', { min: 1, max: 12, step: 0.5 }],
    ['studyTo', 'Final study hours', 'number', { min: 1, max: 12, step: 0.5 }],
    ['projectHours', 'Night project hours', 'number', { min: 0.5, max: 6, step: 0.5 }],
    ['projectTime', 'Night project reminder', 'time'],
  ]],
];

export function SettingsPage() {
  const { settings, status, saveSettings, resetAll, days } = useTracker();
  const toast = useToast();
  const [form, setForm] = useState(settings);

  const setField = (key, type) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: type === 'number' ? Number(e.target.value) : type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const setNaukri = (i) => (e) =>
    setForm((f) => ({ ...f, naukri: f.naukri.map((t, j) => (j === i ? e.target.value : t)) }));

  const save = async () => {
    if (form.end <= form.start) return toast('End date must come after the start date');
    const result = await saveSettings(form);
    toast(result.ok ? (result.offline ? 'Saved on this device' : 'Settings saved') : result.message);
  };

  const backup = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ settings, days }));
      toast('Backup copied');
    } catch {
      toast("Couldn't access the clipboard");
    }
  };

  const erase = async () => {
    if (!window.confirm("Erase every day you've logged? This can't be undone.")) return;
    await resetAll();
    toast('All data erased');
  };

  return (
    <section className="view active" aria-label="Settings">
      <div className="panel">
        <h2>Your goals</h2>
        <p className="sub">
          Change any target here. Study hours start at the first value and rise by half an hour
          every two weeks.
        </p>
        <div className="form">
          {GROUPS.map(([title, fields, description]) => (
            <FieldGroup key={title} title={title} description={description}>
              {fields.map(([key, label, type, extra]) =>
                type === 'checkbox' ? (
                  <label key={key} className="check">
                    <input type="checkbox" checked={Boolean(form[key])} onChange={setField(key, type)} {...extra} />
                    {label}
                  </label>
                ) : (
                  <label key={key}>
                    {label}
                    <input type={type} value={form[key]} onChange={setField(key, type)} {...extra} />
                  </label>
                ),
              )}
              {title === 'Job search' &&
                form.naukri.map((time, i) => (
                  <label key={`naukri${i}`}>
                    Naukri update {i + 1}
                    <input type="time" value={time} onChange={setNaukri(i)} />
                  </label>
                ))}
            </FieldGroup>
          ))}
        </div>
        <RewardsEditor rewards={form.rewards} onChange={(rewards) => setForm((f) => ({ ...f, rewards }))} />
        <CustomGoalsList
          habits={form.customHabits ?? []}
          onChange={(customHabits) => setForm((f) => ({ ...f, customHabits }))}
        />
        <div className="btnrow">
          <button className="btn primary" onClick={save}>
            Save settings
          </button>
          <button className="btn" onClick={backup}>
            Copy backup to clipboard
          </button>
          <button className="btn danger" onClick={erase}>
            Erase all data
          </button>
        </div>
        <p className="sub" style={{ marginTop: 16 }}>
          {
            {
              online: 'Your data is saved to the server and cached on this device.',
              cloud: 'Your data is saved to your claude.ai account, so it follows you across devices.',
              local: 'Your data is saved in this browser. Use the backup button now and then.',
              offline: 'The server is unreachable. Changes are kept on this device and sent when it comes back.',
              loading: 'Connecting…',
            }[status]
          }
        </p>
      </div>
    </section>
  );
}

const SECTION_NAME = Object.fromEntries(SECTIONS.map((s) => [s.id, s.name]));

function RewardsEditor({ rewards, onChange }) {
  const [emoji, setEmoji] = useState('🎁');
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    onChange([...rewards, { id: `r-${makeId().slice(0, 8)}`, emoji: emoji.trim() || '🎁', name: name.trim().slice(0, 40) }]);
    setName('');
  };
  return (
    <div className="editor-block">
      <h3>Your treats</h3>
      <p className="sub">What you&apos;ll pick from when you earn a treat week.</p>
      <div className="reward-picks">
        {rewards.map((r) => (
          <span key={r.id} className="reward-chip">
            {r.emoji} {r.name}
            <button
              aria-label={`Remove ${r.name}`}
              disabled={rewards.length === 1}
              onClick={() => onChange(rewards.filter((x) => x.id !== r.id))}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="addrow" style={{ marginTop: 10, maxWidth: 480 }}>
        <input value={emoji} onChange={(e) => setEmoji(e.target.value)} aria-label="Emoji" style={{ maxWidth: 64, textAlign: 'center' }} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Street food night" aria-label="Treat name" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button onClick={add}>Add</button>
      </div>
    </div>
  );
}

function CustomGoalsList({ habits, onChange }) {
  return (
    <div className="editor-block">
      <h3>Your own goals</h3>
      <p className="sub">Add new goals from the Today tab (&ldquo;+ Add a goal&rdquo; under any section). Each one is worth 2.5 points of its section.</p>
      {habits.length === 0 ? (
        <p className="sub">None yet.</p>
      ) : (
        <ul className="items">
          {habits.map((h) => (
            <li key={h.id}>
              <span>
                <strong>{h.name}</strong> · {SECTION_NAME[h.section]}
                {h.type === 'count' ? ` · target ${h.target}${h.unit ? ` ${h.unit}` : ''}` : ''}
                {h.time ? ` · ⏰ ${formatTime(h.time)}` : ''}
              </span>
              <button aria-label={`Remove ${h.name}`} onClick={() => onChange(habits.filter((x) => x.id !== h.id))}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldGroup({ title, description, children }) {
  return (
    <>
      <h3>{title}</h3>
      {description && (
        <p className="sub" style={{ margin: '-6px 0 4px', gridColumn: '1 / -1' }}>
          {description}
        </p>
      )}
      {children}
    </>
  );
}
