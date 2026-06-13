import { useState, useEffect, useCallback } from 'react';
import type { Theme } from '../lib/types';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('avd-manager-theme');
    return (stored as Theme) || 'system';
  });

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }, []);

  const applyTheme = useCallback(
    (t: Theme) => {
      const resolved = t === 'system' ? getSystemTheme() : t;
      document.documentElement.setAttribute('data-theme', resolved);
    },
    [getSystemTheme]
  );

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem('avd-manager-theme', t);
      applyTheme(t);
    },
    [applyTheme]
  );

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return { theme, setTheme };
}
