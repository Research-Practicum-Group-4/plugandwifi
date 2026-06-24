import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const THEME_KEY = '@plugandwifi/theme';

export const lightColors = {
  primary: '#2f8a64', primaryDark: '#253c50',
  background: '#ffffff', surface: '#f8f9fa', border: '#e5e7eb',
  text: '#111827', textMuted: '#6b7280', star: '#facc15',
  white: '#ffffff', danger: '#dc2626',
};

export const darkColors = {
  primary: '#3da876', primaryDark: '#8ab4f8',
  background: '#0f172a', surface: '#1e293b', border: '#334155',
  text: '#f1f5f9', textMuted: '#94a3b8', star: '#facc15',
  white: '#1e293b', danger: '#ef4444',
};

type ThemeCtx = {
  isDark: boolean;
  toggleDark: () => void;
  colors: typeof lightColors;
};

const C = createContext<ThemeCtx>({ isDark: false, toggleDark: () => {}, colors: lightColors });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemDark = useColorScheme() === 'dark';
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => {
      if (v === 'dark') setIsDark(true);
      else if (v === 'light') setIsDark(false);
      else setIsDark(systemDark);
    });
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <C.Provider value={{ isDark, toggleDark, colors: isDark ? darkColors : lightColors }}>
      {children}
    </C.Provider>
  );
}

export function useTheme() { return useContext(C); }
