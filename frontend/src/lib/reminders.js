/** Builds today's reminder list from settings and the day's progress. Pure, no side effects. */

export function buildReminders(settings, day) {
  const d = day ?? {};
  const naukri = d.naukri ?? [];
  const list = [
    { id: 'wake', time: settings.wake, label: 'Wake up', done: Boolean(d.wake), patch: { wake: true } },
    {
      id: 'meds',
      time: settings.medTime,
      label: 'Take your medicines',
      done: (d.meds ?? 0) >= settings.meds,
      patch: { meds: settings.meds },
    },
    ...settings.naukri.map((time, i) => ({
      id: `naukri${i}`,
      time,
      label: `Update your Naukri profile (${i + 1} of 3)`,
      done: Boolean(naukri[i]),
      patch: { naukri: [0, 1, 2].map((j) => (j === i ? true : Boolean(naukri[j]))) },
    })),
    {
      id: 'walkLunch',
      time: settings.lunchWalk,
      label: 'Walk after lunch',
      done: Boolean(d.walkLunch),
      patch: { walkLunch: true },
    },
    {
      id: 'apps',
      time: settings.applyBy,
      label: `Finish your ${settings.apps} job applications`,
      done: (d.apps ?? 0) >= settings.apps,
      patch: null, // needs a real count, so it can't be ticked from the alert
    },
    {
      id: 'project',
      time: settings.projectTime,
      label: `Night project: ${settings.projectHours} hours of building`,
      done: (d.project ?? 0) >= settings.projectHours,
      patch: null, // log the hours you actually spent
    },
    {
      id: 'walkDinner',
      time: settings.dinnerWalk,
      label: 'Walk after dinner',
      done: Boolean(d.walkDinner),
      patch: { walkDinner: true },
    },
    // Your own goals with a reminder time
    ...(settings.customHabits ?? [])
      .filter((h) => h.time)
      .map((h) => {
        const value = d.custom?.[h.id];
        return {
          id: `custom-${h.id}`,
          time: h.time,
          label: h.name,
          done: h.type === 'count' ? (value ?? 0) >= (h.target || 1) : Boolean(value),
          patch: h.type === 'count' ? null : { custom: { ...d.custom, [h.id]: true } },
        };
      }),
  ];
  return list.sort((a, b) => a.time.localeCompare(b.time));
}

/** Label each reminder as done, due (time passed, not done), next, or upcoming. */
export function reminderStates(reminders, currentHM) {
  let nextFound = false;
  return reminders.map((r) => {
    if (r.done) return { ...r, state: 'done' };
    if (r.time <= currentHM) return { ...r, state: 'due' };
    if (!nextFound) {
      nextFound = true;
      return { ...r, state: 'next' };
    }
    return { ...r, state: 'upcoming' };
  });
}
