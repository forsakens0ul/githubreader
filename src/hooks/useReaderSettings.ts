import { useState, useEffect } from 'react';
import type { ReadingSettings } from '../types';
import { DEFAULT_SETTINGS, getStoredSettings, saveStoredSettings } from '../db';

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getStoredSettings().then((stored) => {
      setSettings(stored);
      setLoaded(true);
    });
  }, []);

  const updateSettings = (updates: Partial<ReadingSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      saveStoredSettings(next);
      return next;
    });
  };

  // Sync theme classes to body / document
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-eye-care');
    root.classList.add(`theme-${settings.theme}`);

    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme, loaded]);

  return {
    settings,
    updateSettings,
    loaded,
  };
}
