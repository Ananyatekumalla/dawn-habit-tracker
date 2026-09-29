import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage.js';

const KEY = 'dawn-theme';

/** Light/dark toggle layered over the system preference. */
export function useTheme() {
  const [theme, setTheme] = useState(() => readJSON(KEY, null));

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    writeJSON(KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const isDark = current
        ? current === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'light' : 'dark';
    });
  }, []);

  return { theme, toggle };
}
