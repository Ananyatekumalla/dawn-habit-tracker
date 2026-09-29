import { useCallback, useMemo } from 'react';
import { useToast } from '../components/common/Toast.jsx';
import { burst } from '../lib/burst.js';
import { setTreat, weekTreats } from '../lib/treats.js';
import { useTracker } from './useTracker.jsx';

/** Weekly treats plus the actions to pick one and mark it enjoyed. */
export function useTreats(today) {
  const { settings, days, saveSettings } = useTracker();
  const toast = useToast();
  const weeks = useMemo(() => weekTreats({ settings, days, today }), [settings, days, today]);

  const pick = useCallback(
    (weekIndex, rewardId) => saveSettings(setTreat(settings, weekIndex, { rewardId })),
    [settings, saveSettings],
  );

  const enjoyed = useCallback(
    async (weekIndex, value) => {
      await saveSettings(setTreat(settings, weekIndex, { enjoyed: value }));
      if (value) {
        burst(document.activeElement);
        toast('Treat enjoyed. You earned it! 🎉');
      }
    },
    [settings, saveSettings, toast],
  );

  return { weeks, current: weeks.find((w) => w.current) ?? weeks.at(-1), rewards: settings.rewards, pick, enjoyed };
}
