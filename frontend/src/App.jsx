import { lazy, Suspense, useState } from 'react';
import { Header } from './components/layout/Header.jsx';
import { TabBar } from './components/layout/TabBar.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { UnlockCelebration } from './components/awards/UnlockCelebration.jsx';
import { useAchievements } from './hooks/useAchievements.js';
import { useNow } from './hooks/useNow.js';
import { useTheme } from './hooks/useTheme.js';
import { TrackerProvider, useTracker } from './hooks/useTracker.jsx';
import { toKey } from './lib/dates.js';
import { AchievementsPage } from './pages/AchievementsPage.jsx';
import { JournalPage } from './pages/JournalPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { StudyPage } from './pages/StudyPage.jsx';
import { TodayPage } from './pages/TodayPage.jsx';

// Chart pages load on demand so the first paint stays small.
const HomePage = lazy(() => import('./pages/HomePage.jsx').then((m) => ({ default: m.HomePage })));
const WeekPage = lazy(() => import('./pages/WeekPage.jsx').then((m) => ({ default: m.WeekPage })));

function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
    </div>
  );
}

function Shell() {
  const { settings, days, topics, status } = useTracker();
  const { theme, toggle } = useTheme();
  const now = useNow();
  const today = toKey(now);
  const [tab, setTab] = useState('home');
  const [journalDate, setJournalDate] = useState(today);
  const achievements = useAchievements({ settings, days, topics, today, ready: status !== 'loading' });

  const changeTab = (next) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openJournal = (dateKey) => {
    setJournalDate(dateKey);
    changeTab('journal');
  };

  return (
    <>
      <Backdrop />
      <div className="wrap">
        <Header settings={settings} status={status} onToggleTheme={toggle} />
        <Suspense fallback={<p className="empty">Loading…</p>}>
          {tab === 'home' && <HomePage key={theme} today={today} now={now} onNavigate={changeTab} />}
          {tab === 'today' && <TodayPage today={today} now={now} onOpenDay={openJournal} />}
          {tab === 'study' && <StudyPage today={today} />}
          {tab === 'week' && <WeekPage today={today} theme={theme} />}
          {tab === 'awards' && <AchievementsPage achievements={achievements} today={today} />}
          {tab === 'journal' && <JournalPage dateKey={journalDate} onDateChange={setJournalDate} />}
          {tab === 'settings' && <SettingsPage />}
        </Suspense>
      </div>
      <TabBar active={tab} onChange={changeTab} />
      <UnlockCelebration
        unlock={achievements.unlock}
        remaining={achievements.remaining}
        onNext={achievements.nextUnlock}
        onSeeAll={() => {
          achievements.clearUnlocks();
          changeTab('awards');
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <TrackerProvider>
        <Shell />
      </TrackerProvider>
    </ToastProvider>
  );
}
